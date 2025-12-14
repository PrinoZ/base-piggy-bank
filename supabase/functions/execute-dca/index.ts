// supabase/functions/execute-dca/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ethers } from 'https://esm.sh/ethers@6.7.0'

const PRIVATE_KEY = Deno.env.get('BACKEND_WALLET_PRIVATE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

    // 强制 Gas Limit，跳过预估检查
    const txOptions = {
        maxPriorityFeePerGas: ethers.parseUnits('0.01', 'gwei'),
        maxFeePerGas: ethers.parseUnits('0.1', 'gwei'),
        gasLimit: 500000 // 稍微给多一点，防止OutOfGas
    };

    const results = []

    for (const job of jobs) {
      let txHash = null;
      let status = 'SUCCESS'; // 默认先设为成功
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

        // === 1. 发送交易 ===
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

        // === 2. 关键修改：等待链上确认 ===
        // Base 链很快，通常 2-3 秒就能确认
        console.log("Waiting for receipt...");
        const receipt = await tx.wait();

        // === 3. 检查链上真实状态 ===
        // status: 1 代表成功，0 代表失败(Revert)
        if (receipt.status === 0) {
            throw new Error("Transaction Reverted on-chain (execution failed)");
        }
        console.log("Tx confirmed success!");

      } catch (err: any) {
        console.error(`Job ${job.id} failed:`, err)
        
        // 🛑 一旦报错（包括链上Revert），标记为失败
        status = 'FAILED'; 
        
        // 如果没有生成 Hash (比如发之前就挂了)，生成一个错误标记
        if (!txHash) {
             txHash = "0xError" + Math.random().toString(16).substr(2, 8); 
        }
        errorMessage = String(err.message || err).slice(0, 100);
      }

      // === 写入数据库 ===
      const { error: logError } = await supabase
        .from('dca_transactions')
        .insert({
            job_id: job.id,
            user_address: job.user_address, 
            amount_usdc: job.amount_per_trade,
            tx_hash: txHash,
            status: status, // 这里现在能正确记录 'FAILED' 了
            created_at: new Date().toISOString()
        });
          
      if (logError) console.error("Failed to log transaction:", logError);

      // === 更新排行榜（仅当交易成功时） ===
      if (status === 'SUCCESS') {
        // 获取用户当前的排行榜数据
        const { data: currentLeaderboard } = await supabase
          .from('leaderboard_table')
          .select('total_invested, total_trades')
          .eq('user_address', job.user_address.toLowerCase())
          .maybeSingle();

        const currentInvested = currentLeaderboard?.total_invested || 0;
        const currentTrades = currentLeaderboard?.total_trades || 0;

        // Upsert 更新排行榜
        const { error: leaderboardError } = await supabase
          .from('leaderboard_table')
          .upsert({
            user_address: job.user_address.toLowerCase(),
            total_invested: Number(currentInvested) + Number(job.amount_per_trade),
            total_trades: Number(currentTrades) + 1,
            last_trade_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_address',
          });

        if (leaderboardError) {
          console.error(`Failed to update leaderboard for ${job.user_address}:`, leaderboardError);
        }
      }

      // 更新下次运行时间
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