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

    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider)
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet)

    // === 核心修改：Gas 价格 + 用量三重锁定 ===
    // 1. maxPriorityFeePerGas: 给矿工的小费 (0.01 Gwei)
    // 2. maxFeePerGas: 总价封顶 (0.1 Gwei)
    // 3. gasLimit: 强制指定用量 (300,000)
    //    计算：300,000 * 0.1 Gwei = 0.00003 ETH
    //    只要你的余额 > 0.00003 ETH (约 $0.11)，这笔交易就能发出去！
    const txOptions = {
        maxPriorityFeePerGas: ethers.parseUnits('0.01', 'gwei'),
        maxFeePerGas: ethers.parseUnits('0.1', 'gwei'),
        gasLimit: 300000 // <--- 新增：彻底跳过预估，强行执行
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
        // 将 txOptions 作为最后一个参数传入
        const tx = await contract.executeDCA(
          cleanUserAddr, 
          amountIn, 
          0, 
          ethers.ZeroAddress, 
          routes,
          txOptions // <--- 应用三重锁定配置
        )
        
        console.log(`Tx sent: ${tx.hash}`)
        
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