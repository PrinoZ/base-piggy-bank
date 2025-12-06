import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import { NextResponse } from 'next/server';

// 初始化超级管理员客户端
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 使用 Service Role Key
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, signature, userAddress, planData } = body;

    // 1. 安全验证：检查签名是否由 userAddress 签署
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 2. 验证通过，以管理员身份写入数据库
    const { data, error } = await supabaseAdmin
      .from('dca_jobs')
      .insert([{
        ...planData,
        user_address: userAddress.toLowerCase(), // 强制使用验证过的地址
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}