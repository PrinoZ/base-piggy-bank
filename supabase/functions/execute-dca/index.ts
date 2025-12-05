// supabase/functions/execute-dca/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ethers } from 'https://esm.sh/ethers@6.7.0'

const PRIVATE_KEY = Deno.env.get('BACKEND_WALLET_PRIVATE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// === 配置区域 ===
// 【依然使用旧合约地址】
const CONTRACT_ADDRESS = "0x9432f3cf09e63d4b45a8e292ad4d38d2e677ad0c" 
const RPC_URL = "https://mainnet.base.org" 
const AERODROME_FACTORY = "0x420dd381b31aef6683db6b902084cb0ffece40da"

const ABI = [
  "function executeDCA(address user, uint256 amountIn, uint256 minAmountOut, address referrer, tuple(address from, address to, bool stable, address factory)[] routes) external"
];

Deno.serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // 查找 ACTIVE 且时间已到的任务
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

    // 验证新代码是否部署成功的标记
    console.log("=== RUNNING V4: LOGGING + GAS LIMIT (300k) ===") 

    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider)
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet)

    // === 核心修改：Gas 价格 + 用量三重锁定 ===
    const txOptions = {
        // 1. 小费：极低 (0.01 Gwei)
        maxPriorityFeePerGas: ethers.parseUnits('0.01', 'gwei'),
        // 2. 总价封顶：限制最高 0.1 Gwei
        maxFeePerGas: ethers.parseUnits('0.1', 'gwei'),
        // 3. 【新增】强制指定 Gas 用量 (30万足够覆盖)
        // 这一步彻底跳过 estimateGas，防止余额不足报错
        gasLimit: 300000 
    };

    const results = []

    for (const job of jobs) {
      try {
        console.log(`Processing job ${job.id} for user: ${job.user_address}`)
        
        const amountIn = ethers.parseUnits(job.amount_per_trade.toString(), 6) 
        
        // 地址清洗
        const cleanTokenIn = ethers.getAddress(job.token_in.toLowerCase())
        const cleanTokenOut = ethers.getAddress(job.token_out.toLowerCase())
        const cleanUserAddr = ethers.getAddress(job.user_address.toLowerCase())
        
        const routes = [{
          from: cleanTokenIn,
          to: cleanTokenOut,
          stable: false,
          factory: AERODROME_FACTORY
        }]

        console.log("Sending tx with routes:", JSON.stringify(routes))

        // === 发送交易 ===
        const tx = await contract.executeDCA(
          cleanUserAddr, 
          amountIn, 
          0, 
          ethers.ZeroAddress, 
          routes,
          txOptions // <--- 应用三重锁定配置
        )
        
        console.log(`Tx sent: ${tx.hash}`)

        // === 新增：记录交易历史到数据库 ===
        // 这让前端可以在卡片详情里展示"Transaction History"
        const { error: logError } = await supabase
          .from('dca_transactions')
          .insert({
            job_id: job.id,
            user_address: job.user_address, // 存原始的全小写即可
            amount_usdc: job.amount_per_trade,
            tx_hash: tx.hash
          });
          
        if (logError) console.error("Failed to log transaction:", logError);
        
        // 更新下一次运行时间
        const nextRun = new Date(new Date().getTime() + job.frequency_seconds * 1000)
        
        await supabase
          .from('dca_jobs')
          .update({ next_run_time: nextRun.toISOString() })
          .eq('id', job.id)

        results.push({ id: job.id, status: 'success', hash: tx.hash })

      } catch (err: any) {
        console.error(`Job ${job.id} failed:`, err)
        results.push({ id: job.id, status: 'failed', error: String(err) })
      }
    }

    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } })

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})