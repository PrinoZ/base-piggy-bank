// ⚠️ COLD START HACK: Mock data generator for growth strategy
// TODO: Remove this entire file after cold start success
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Secret key to prevent unauthorized access (set in env: MOCK_DATA_SECRET)
const MOCK_DATA_SECRET = process.env.MOCK_DATA_SECRET || 'change-me-in-production';

// 定投频率配置（与前端保持一致）
const FREQUENCIES = [
  { label: 'Daily', days: 1 },
  { label: '3 Days', days: 3 },
  { label: 'Weekly', days: 7 },
  { label: 'Bi-Weekly', days: 14 }
];

// 生成看起来真实的以太坊地址（使用常见模式，避免明显随机）
function generateMockAddress(): string {
  const chars = '0123456789abcdef';
  let address = '0x';

  // 首位使用更常见的模式（避免全是 0 或 f）
  const commonPrefixes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e'];
  address += commonPrefixes[Math.floor(Math.random() * commonPrefixes.length)];

  // 中间部分随机
  for (let i = 0; i < 38; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }

  // 最后一位避免全0或全f
  const lastChar = chars[Math.floor(Math.random() * (chars.length - 2)) + 1];
  address += lastChar;

  return address.toLowerCase();
}

// 生成随机定投计划参数
function generatePlanParams(maxTotalInvested: number = 20000) {
  const amountPerTrade = Math.floor(Math.random() * 450) + 50; // 50-500 USDC
  const freqIndex = Math.floor(Math.random() * FREQUENCIES.length);
  const frequency = FREQUENCIES[freqIndex];
  const durationMonths = Math.floor(Math.random() * 36) + 3; // 3-39个月
  
  // 计算总定投金额
  const investmentsPerMonth = 30 / frequency.days;
  const monthlyAmount = amountPerTrade * investmentsPerMonth;
  const totalInvested = monthlyAmount * durationMonths;
  
  // 如果超过限制，调整duration
  let adjustedDuration = durationMonths;
  if (totalInvested > maxTotalInvested) {
    adjustedDuration = Math.floor(maxTotalInvested / monthlyAmount);
    if (adjustedDuration < 1) adjustedDuration = 1;
  }
  
  return {
    amount_per_trade: amountPerTrade,
    frequency_seconds: frequency.days * 24 * 60 * 60,
    frequency_days: frequency.days,
    duration_months: adjustedDuration,
  };
}

// 生成历史交易记录（更自然的时间分布）
function generateHistoryTransactions(
  jobId: string,
  userAddress: string,
  amountPerTrade: number,
  frequencyDays: number,
  durationMonths: number,
  startDate: Date
) {
  const transactions = [];
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + durationMonths);
  const now = new Date();
  const actualEndDate = endDate < now ? endDate : now;
  
  let currentDate = new Date(startDate);
  let totalInvested = 0;
  let consecutiveFailures = 0;
  
  while (currentDate <= actualEndDate && totalInvested < 20000) {
    // 更真实的成功率：95%成功率，但连续失败后成功率降低
    let successRate = 0.95;
    if (consecutiveFailures > 0) {
      successRate = Math.max(0.7, 0.95 - consecutiveFailures * 0.1);
    }
    
    const isSuccess = Math.random() < successRate;
    const status = isSuccess ? 'SUCCESS' : 'FAILED';
    
    if (isSuccess) {
      consecutiveFailures = 0;
      totalInvested += amountPerTrade;
    } else {
      consecutiveFailures++;
    }
    
    // 生成看起来真实的交易哈希（使用更常见的模式）
    const hashPrefix = Math.random() > 0.5 ? '0x' : '0x0';
    const hashSuffix = Array.from({ length: 64 }, () => 
      '0123456789abcdef'[Math.floor(Math.random() * 16)]
    ).join('');
    const txHash = hashPrefix + hashSuffix;
    
    // 添加随机时间偏移（�?小时），让交易时间更自然
    const timeOffset = (Math.random() - 0.5) * 2 * 60 * 60 * 1000; // ±2小时
    const transactionTime = new Date(currentDate.getTime() + timeOffset);
    
    transactions.push({
      job_id: jobId,
      user_address: userAddress,
      amount_usdc: amountPerTrade,
      tx_hash: txHash,
      status: status,
      created_at: transactionTime.toISOString(),
    });
    
    // 移动到下一个交易日期（添加小的随机偏移，�?天）
    const dayOffset = frequencyDays + (Math.random() - 0.5) * 2;
    currentDate.setDate(currentDate.getDate() + dayOffset);
  }
  
  return { transactions, totalInvested };
}

export async function POST(req: Request) {
  try {
    // ⚠️ COLD START HACK: Verify secret key
    const authHeader = req.headers.get('authorization');
    const body = await req.json().catch(() => ({}));
    const providedSecret = authHeader?.replace('Bearer ', '') || body.secret;
    
    if (providedSecret !== MOCK_DATA_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { count = 50 } = body;
    
    // Silent logging (no console.log in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Generate Mock Data] Creating ${count} mock accounts...`);
    }
    
    interface MockAccount {
      address: string;
      job: any;
      transactions: any[];
      totalInvested: number;
      totalTrades: number;
    }
    
    const mockAccounts: MockAccount[] = [];
    const allJobs: any[] = [];
    const allTransactions: any[] = [];
    const leaderboardEntries: any[] = [];
    
    // 生成模拟账号
    for (let i = 0; i < count; i++) {
      const userAddress = generateMockAddress();
      const planParams = generatePlanParams(20000);
      
    // 随机选择开始日期（过去1-6个月，更自然的分布）
    // 使用指数分布，让更多账号看起来是最近加入的
    const monthsAgo = Math.min(
      Math.floor(Math.random() * Math.random() * 6) + 1,
      6
    );
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsAgo);
    // 添加随机天数，让开始时间更自然
    startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30));
      
      // 创建定投计划
      const job = {
        user_address: userAddress,
        token_in: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC
        token_out: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf', // cbBTC
        amount_per_trade: planParams.amount_per_trade,
        frequency_seconds: planParams.frequency_seconds,
        next_run_time: new Date().toISOString(),
        status: 'ACTIVE',
        created_at: startDate.toISOString(),
      };
      
      allJobs.push(job);
      
      // 生成历史交易记录
      const { transactions, totalInvested } = generateHistoryTransactions(
        `mock_job_${i}`, // 临时ID，插入后会更新为真实ID
        userAddress,
        planParams.amount_per_trade,
        planParams.frequency_days,
        planParams.duration_months,
        startDate
      );
      
      // 计算交易次数
      const successCount = transactions.filter(t => t.status === 'SUCCESS').length;
      
      // 准备leaderboard数据
      leaderboardEntries.push({
        user_address: userAddress,
        total_invested: totalInvested,
        total_trades: successCount,
      });
      
      mockAccounts.push({
        address: userAddress,
        job: job,
        transactions: transactions,
        totalInvested,
        totalTrades: successCount,
      });
    }
    
    // 批量插入到数据库（静默模式）
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Generate Mock Data] Inserting ${allJobs.length} jobs...`);
    }
    
    // 1. 插入定投计划
    const { data: insertedJobs, error: jobsError } = await supabaseAdmin
      .from('dca_jobs')
      .insert(allJobs)
      .select('id, user_address');
    
    if (jobsError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Generate Mock Data] Jobs insert error:', jobsError);
      }
      throw jobsError;
    }
    
    // 2. 为每个job生成交易记录（使用真实的job ID）
    const jobMap = new Map<string, any>();
    insertedJobs?.forEach((job: any) => {
      const account = mockAccounts.find(a => a.address === job.user_address);
      if (account) {
        jobMap.set(account.address, job.id);
      }
    });
    
    // 更新交易记录中的job_id
    for (const account of mockAccounts) {
      const realJobId = jobMap.get(account.address);
      if (realJobId) {
        account.transactions.forEach((tx: any) => {
          tx.job_id = realJobId;
        });
        allTransactions.push(...account.transactions);
      }
    }
    
    // 3. 批量插入交易记录（分批处理，避免单次插入过多）
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Generate Mock Data] Inserting ${allTransactions.length} transactions...`);
    }
    const batchSize = 100;
    for (let i = 0; i < allTransactions.length; i += batchSize) {
      const batch = allTransactions.slice(i, i + batchSize);
      const { error: txError } = await supabaseAdmin
        .from('dca_transactions')
        .insert(batch);
      
      if (txError && process.env.NODE_ENV === 'development') {
        console.error(`[Generate Mock Data] Transactions batch ${i} error:`, txError);
      }
    }
    
    // 4. 更新或插入leaderboard（使用upsert避免重复）
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Generate Mock Data] Updating leaderboard...`);
    }
    
    // 先获取现有的leaderboard数据（排除模拟账号，避免重复计算）
    const mockAddresses = new Set(mockAccounts.map(a => a.address.toLowerCase()));
    const { data: existingLeaderboard } = await supabaseAdmin
      .from('leaderboard_table')
      .select('user_address, total_invested, total_trades');
    
    // 过滤掉模拟账号（如果之前已经生成过）
    const realUserEntries = existingLeaderboard?.filter(
      (entry: any) => !mockAddresses.has(entry.user_address.toLowerCase())
    ) || [];
    
    // 合并数据：模拟账�?+ 现有真实用户
    const mergedLeaderboard = [...leaderboardEntries, ...realUserEntries];
    
    // 按地址聚合（如果有多个计划）
    const aggregated = new Map();
    mergedLeaderboard.forEach((entry: any) => {
      const key = entry.user_address.toLowerCase();
      if (aggregated.has(key)) {
        aggregated.get(key).total_invested += entry.total_invested;
        aggregated.get(key).total_trades += entry.total_trades;
      } else {
        aggregated.set(key, { 
          user_address: entry.user_address.toLowerCase(),
          total_invested: entry.total_invested || 0,
          total_trades: entry.total_trades || 0,
        });
      }
    });
    
    // Upsert到leaderboard表（user_address应该是主键或唯一键）
    const finalLeaderboard = Array.from(aggregated.values());
    const { error: leaderboardError } = await supabaseAdmin
      .from('leaderboard_table')
      .upsert(finalLeaderboard, {
        onConflict: 'user_address',
        ignoreDuplicates: false,
      });
    
    if (leaderboardError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Generate Mock Data] Leaderboard error:', leaderboardError);
      }
      throw leaderboardError;
    }
    
    // 静默返回（不暴露详细信息）
    return NextResponse.json({
      success: true,
      // ⚠️ COLD START HACK: Minimal response to avoid detection
    });
    
  } catch (error: any) {
    // 临时启用详细日志用于调试
    console.error('[Generate Mock Data] Full Error Details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        // 临时返回详细信息用于调试（生产环境记得删除）
        details: error.message,
      },
      { status: 500 }
    );
  }
}

