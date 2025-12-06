import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { message, signature, userAddress, jobId } = await req.json();

    // 1. 验证签名
    const recoveredAddress = ethers.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 2. 验证该 Job 是否属于该用户
    const { data: job } = await supabaseAdmin
      .from('dca_jobs')
      .select('user_address')
      .eq('id', jobId)
      .single();

    if (!job || job.user_address.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized: You do not own this plan' }, { status: 403 });
    }

    // 3. 执行取消
    const { error } = await supabaseAdmin
      .from('dca_jobs')
      .update({ status: 'CANCELLED' })
      .eq('id', jobId);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}