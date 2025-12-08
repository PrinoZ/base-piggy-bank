import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains'; // ⚠️ 如果你在测试网开发，请把 base 换成 baseSepolia
import { NextResponse } from 'next/server';

// 1. 初始化 Supabase Admin (保持不变)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 2. 初始化 Viem 客户端 (新增：用于验证 Smart Wallet 签名)
const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, signature, userAddress, planData } = body;

    // 参数检查
    if (!message || !signature || !userAddress || !planData) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    console.log(`[Create Plan] Verifying signature for: ${userAddress}`);

    // ============================================================
    // 3. 核心修复：使用 Viem 进行通用签名验证
    // ============================================================
    // 之前使用 ethers.verifyMessage 只能验证 EOA (普通账户)。
    // viem.verifyMessage 可以同时验证 EOA 和 EIP-1271 (智能合约钱包)。
    const valid = await publicClient.verifyMessage({
      address: userAddress as `0x${string}`,
      message: message,
      signature: signature as `0x${string}`,
    });

    if (!valid) {
      console.error(`[Create Plan] Signature validation failed for ${userAddress}`);
      return NextResponse.json({ 
        error: 'Invalid signature. Smart Wallet verification failed.' 
      }, { status: 401 });
    }

    // 4. 验证通过，写入数据库
    // 强制将所有地址字段转为小写，确保数据一致性
    const { data, error } = await supabaseAdmin
      .from('dca_jobs')
      .insert([{
        user_address: userAddress.toLowerCase(),
        token_in: planData.token_in.toLowerCase(),
        token_out: planData.token_out.toLowerCase(),
        amount_per_trade: planData.amount_per_trade,
        frequency_seconds: planData.frequency_seconds,
        next_run_time: planData.next_run_time,
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
        console.error('[Create Plan] DB Error:', error);
        throw error;
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}