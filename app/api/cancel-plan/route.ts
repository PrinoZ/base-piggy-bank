import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import { NextResponse } from 'next/server';

// 初始化 Supabase
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, signature, userAddress, jobId } = body;

    // 🔍 调试日志：在 Vercel 后台查看这些日志非常重要
    console.log(`[Cancel API] Start. User: ${userAddress}, JobID: ${jobId}`);

    // 0. 参数完整性检查
    if (!message || !signature || !userAddress || !jobId) {
        console.error('[Cancel API] Missing parameters');
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. 验证签名
    // verifyMessage 可能会抛出错误（如果签名格式完全烂掉），所以放在 try 块里
    let recoveredAddress = '';
    try {
        recoveredAddress = ethers.verifyMessage(message, signature);
    } catch (err) {
        console.error('[Cancel API] Verify message failed:', err);
        return NextResponse.json({ error: 'Invalid signature format' }, { status: 400 });
    }

    // 🔍 关键调试：查看恢复出来的地址（手机端通常是大写混合 Checksum 地址）
    console.log(`[Cancel API] Recovered: ${recoveredAddress} | Claimed: ${userAddress}`);

    // 🔴 核心修复：必须双向转为小写进行比较
    if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
      console.error('[Cancel API] Address mismatch!');
      return NextResponse.json({ error: 'Invalid signature: Address mismatch' }, { status: 401 });
    }

    // 2. 验证该 Job 是否属于该用户
    const { data: job, error: fetchError } = await supabaseAdmin
      .from('dca_jobs')
      .select('user_address')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) {
      console.error('[Cancel API] Job not found or DB error:', fetchError);
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 再次确认数据库里的归属权 (强制小写对比)
    if (job.user_address.toLowerCase() !== userAddress.toLowerCase()) {
      console.error('[Cancel API] Ownership mismatch');
      return NextResponse.json({ error: 'Unauthorized: You do not own this plan' }, { status: 403 });
    }

    // 3. 执行取消
    const { error: updateError } = await supabaseAdmin
      .from('dca_jobs')
      .update({ status: 'CANCELLED' })
      .eq('id', jobId);

    if (updateError) {
        console.error('[Cancel API] Update failed:', updateError);
        throw updateError;
    }

    console.log(`[Cancel API] Success for Job ${jobId}`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Cancel API] Critical Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}