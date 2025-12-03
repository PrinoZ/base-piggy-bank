// supabase/functions/execute-dca/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ethers } from 'https://esm.sh/ethers@6.7.0'

// 环境变量读取
const PRIVATE_KEY = Deno.env.get('BACKEND_WALLET_PRIVATE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// === 配置区域 ===
// 【0x9432f3cf09E63D4B45a8e292Ad4D38d2e677AD0C】
const CONTRACT_ADDRESS = "0xYourContractAddressHere" 
const RPC_URL = "https://mainnet.base.org" 

const ABI = [
  "function executeDCA(address user, uint256 amountIn, uint256 minAmountOut, address referrer, tuple(address from, address to, bool stable, address factory)[] routes) external"
];

Deno.serve(async (req) => {
  // 1. 初始化数据库连接 (使用最高权限 Service Role，因为要读写后台任务)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  
  // 2. 查找当前需要执行的任务 (时间已到 且 状态为 ACTIVE)
  const { data: jobs, error } = await supabase
    .from('dca_jobs')
    .select('*')
    .lte('next_run_time', new Date().toISOString()) // next_run_time <= 现在
    .eq('status', 'ACTIVE')

  if (error) {
      console.error("DB Error:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!jobs || jobs.length === 0) {
    return new Response(JSON.stringify({ message: 'No jobs due' }), { headers: { 'Content-Type': 'application/json' } })
  }

  console.log(`Found ${jobs.length} jobs to execute`)

  // 3. 初始化区块链连接
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider)
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet)

  const results = []

  // 4. 循环执行任务
  for (const job of jobs) {
    try {
      console.log(`Processing job ${job.id} for user: ${job.user_address}`)
      
      // 参数转换：USDC 是 6 位精度
      const amountIn = ethers.parseUnits(job.amount_per_trade.toString(), 6) 
      
      // 构建路由 (这里简化为直接路由，生产环境可能需要更复杂的路径查找)
      const routes = [{
        from: job.token_in,
        to: job.token_out,
        stable: false,
        factory: ethers.ZeroAddress
      }]

      // 发起交易
      // executeDCA(user, amountIn, minAmountOut, referrer, routes)
      const tx = await contract.executeDCA(
        job.user_address, 
        amountIn, 
        0, // minAmountOut (MVP暂时设为0，由合约控制滑点或忽略)
        ethers.ZeroAddress, // referrer
        routes
      )
      
      console.log(`Tx sent: ${tx.hash}`)
      
      // 5. 更新数据库：推迟下一次运行时间
      // job.frequency_seconds 单位是秒，也就是下一次运行是 "现在 + 频率"
      // 注意：这里为了防止 Edge Function 超时，我们不等待 tx.wait()，直接认为发送成功即更新
      const nextRun = new Date(new Date().getTime() + job.frequency_seconds * 1000)
      
      await supabase
        .from('dca_jobs')
        .update({ next_run_time: nextRun.toISOString(), fail_count: 0 })
        .eq('id', job.id)
      
      // 记录到日志表 (可选)
      await supabase.from('execution_logs').insert({
          job_id: job.id,
          tx_hash: tx.hash,
          amount_in: job.amount_per_trade,
          status: 'PENDING'
      })

      results.push({ id: job.id, status: 'success', hash: tx.hash })

    } catch (err) {
      console.error(`Job ${job.id} failed:`, err)
      
      // 记录失败
      await supabase.rpc('increment_fail_count', { row_id: job.id })
      // 如果没有 increment_fail_count 函数，可以用下面的简单 update 代替：
      // await supabase.from('dca_jobs').update({ fail_count: job.fail_count + 1 }).eq('id', job.id)

      results.push({ id: job.id, status: 'failed', error: String(err) })
    }
  }

  return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } })
})