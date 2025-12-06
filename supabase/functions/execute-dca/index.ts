// supabase/functions/execute-dca/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ethers } from 'https://esm.sh/ethers@6.7.0'

const PRIVATE_KEY = Deno.env.get('BACKEND_WALLET_PRIVATE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// === 配置区域 ===
const CONTRACT_ADDRESS = "0x9432f3cf09e63d4b45a8e292ad4d38d2e677ad0c" 
const RPC_URL = "https://mainnet.base.org" 
const AERODROME_FACTORY = "0x420dd381b31aef6683db6b902084cb0ffece40da"

const ABI = [
  "function executeDCA(address user, uint256 amountIn, uint256 minAmountOut, address referrer, tuple(address from, address to, bool stable, address factory)[] routes) external"
];

Deno.serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // 1. 查找 ACTIVE 且时间已到的任务
    const { data: jobs, error } = await supabase
      .from('dca_jobs')
      .select('*')
      .lte('next_run_time', new Date().toISOString())
      .eq('status', 'ACTIVE')

    if (error) {
       console.error("DB Error:", error);
       return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ message: 'No jobs due' }), { headers: { 'Content-Type': 'application/json' } })
    }

    console.log(`Found ${jobs.length} jobs to execute`)

    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider)
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet)

    // === Gas 锁定配置 (保留你的 V4 设置) ===
    const txOptions = {
        maxPriorityFeePerGas: ethers.parseUnits('0.01', 'gwei'),
        maxFeePerGas: ethers.parseUnits('0.1', 'gwei'),
        gasLimit: 300000 
    };

    const results = []

    for (const job of jobs) {
      let txHash = null;
      let status = 'SUCCESS'; // 默认为成功，如果在 catch 里会改为 FAILED
      let errorMessage = null;

      try {
        console.log(`Processing job ${job.id} for user: ${job.user_address}`)
        
        const amountIn = ethers.parseUnits(job.amount_per_trade.toString(), 6) 
        
        const cleanTokenIn = ethers.getAddress(job.token_in.toLowerCase())
        const cleanTokenOut = ethers.getAddress(job.token_out.toLowerCase())
        const cleanUserAddr = ethers.getAddress(job.user_address.toLowerCase())
        
        const routes = [{
          from: cleanTokenIn,
          to: cleanTokenOut,
          stable: false,
          factory: AERODROME_FACTORY
        }]

        // === 发送交易 (真交易) ===
        const tx = await contract.executeDCA(
          cleanUserAddr, 
          amountIn, 
          0, 
          ethers.ZeroAddress, 
          routes,
          txOptions 
        )
        
        console.log(`Tx sent: ${tx.hash}`)
        txHash = tx.hash;

        // 等待几个区块确认 (可选，为了更快响应可以不加 await tx.wait())
        // await tx.wait(); 

      } catch (err: any) {
        console.error(`Job ${job.id} failed:`, err)
        status = 'FAILED';
        errorMessage = String(err.message || err).slice(0, 200); // 截取错误信息防止太长
        // 即使失败，我们也生成一个假的 Hash 或者记录 ERROR，以便前端能显示
        txHash = "0xError" + Math.random().toString(16).substr(2, 8); 
      }

      // === 关键修改：无论成功还是失败，都写入数据库 ===
      const { error: logError } = await supabase
        .from('dca_transactions')
        .insert({
            job_id: job.id,
            user_address: job.user_address, 
            amount_usdc: job.amount_per_trade,
            tx_hash: txHash,
            status: status, // 这里会记录 SUCCESS 或 FAILED
            created_at: new Date().toISOString()
        });
          
      if (logError) console.error("Failed to log transaction:", logError);

      // 只有成功时才更新下次运行时间？
      // 通常建议：即使失败也更新时间，或者重试几次。这里我们先按原逻辑：无论结果如何都更新时间，防止卡死
      const nextRun = new Date(new Date().getTime() + job.frequency_seconds * 1000)
      
      await supabase
          .from('dca_jobs')
          .update({ next_run_time: nextRun.toISOString() })
          .eq('id', job.id)

      results.push({ id: job.id, status, hash: txHash, error: errorMessage })
    }

    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } })

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})