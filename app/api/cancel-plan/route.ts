<<<<<<< HEAD
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains'; // 注意：如果你在测试网请用 baseSepolia
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const nonceCache = new Map<string, number>();

async function checkAndStoreNonce(nonce: string, userAddress: string, expiresAt: number) {
  const cached = nonceCache.get(nonce);
  if (cached && Date.now() < cached) return false;
  nonceCache.set(nonce, expiresAt);

  try {
    const { data: existing } = await supabaseAdmin
      .from('nonce_store')
      .select('nonce, expires_at')
      .eq('nonce', nonce)
      .maybeSingle();

    if (existing && new Date(existing.expires_at).getTime() > Date.now()) {
      return false;
    }

    if (existing) {
      await supabaseAdmin.from('nonce_store').delete().eq('nonce', nonce);
    }

    const { error: upsertError } = await supabaseAdmin.from('nonce_store').upsert({
      nonce,
      user_address: userAddress.toLowerCase(),
      expires_at: new Date(expiresAt).toISOString(),
      created_at: new Date().toISOString(),
    });
    if (upsertError) throw upsertError;
  } catch (err) {
    console.warn('Nonce store check failed, falling back to in-memory only', err);
  }

  return true;
}

// 创建 Base 链客户端 (viem)
const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

export async function POST(req: Request) {
  try {
    const { message, signature, userAddress, jobId, expiresAt, nonce } = await req.json();

    console.log(`[Cancel API] Checking Job: ${jobId} for User: ${userAddress}`);

    if (!message || !signature || !userAddress || !jobId || !expiresAt || !nonce) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (Date.now() > Number(expiresAt)) {
      return NextResponse.json({ error: 'Request expired' }, { status: 400 });
    }

    const nonceOk = await checkAndStoreNonce(String(nonce), userAddress, Number(expiresAt));
    if (!nonceOk) {
      return NextResponse.json({ error: 'Nonce already used' }, { status: 400 });
    }

    // =================================================================
    // ✅ 终极解决方案：使用 viem 进行验证
    // viem 会自动检测地址是 EOA 还是 Smart Wallet。
    // 如果是 Smart Wallet，它会自动调用链上的 EIP-1271 isValidSignature 方法。
    // =================================================================
    const valid = await publicClient.verifyMessage({
      address: userAddress as `0x${string}`,
      message: message,
      signature: signature as `0x${string}`,
    });

    if (!valid) {
      console.error(`[Cancel API] Signature validation failed for ${userAddress}`);
      // 这是最可能的失败原因：ethers 无法处理智能钱包，但 viem 可以。
      // 如果 viem 也失败，说明签名内容真的被篡改了，或者链网络不通。
      return NextResponse.json({ error: 'Invalid signature (EIP-1271 check failed)' }, { status: 401 });
    }

    // --- 验证通过，下面是正常的数据库逻辑 ---

    // 1. 验证归属权
    const { data: job } = await supabaseAdmin
      .from('dca_jobs')
      .select('user_address')
      .eq('id', jobId)
      .single();

    if (!job || job.user_address.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. 执行取消
    const { error: updateError } = await supabaseAdmin
      .from('dca_jobs')
      .update({ status: 'CANCELLED' })
      .eq('id', jobId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Cancel API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
=======
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains'; // 注意：如果你在测试网请用 baseSepolia
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const nonceCache = new Map<string, number>();

async function checkAndStoreNonce(nonce: string, userAddress: string, expiresAt: number) {
  const cached = nonceCache.get(nonce);
  if (cached && Date.now() < cached) return false;
  nonceCache.set(nonce, expiresAt);

  try {
    const { data: existing } = await supabaseAdmin
      .from('nonce_store')
      .select('nonce, expires_at')
      .eq('nonce', nonce)
      .maybeSingle();

    if (existing && new Date(existing.expires_at).getTime() > Date.now()) {
      return false;
    }

    if (existing) {
      await supabaseAdmin.from('nonce_store').delete().eq('nonce', nonce);
    }

    const { error: upsertError } = await supabaseAdmin.from('nonce_store').upsert({
      nonce,
      user_address: userAddress.toLowerCase(),
      expires_at: new Date(expiresAt).toISOString(),
      created_at: new Date().toISOString(),
    });
    if (upsertError) throw upsertError;
  } catch (err) {
    console.warn('Nonce store check failed, falling back to in-memory only', err);
  }

  return true;
}

// 创建 Base 链客户端 (viem)
const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

export async function POST(req: Request) {
  try {
    const { message, signature, userAddress, jobId, expiresAt, nonce } = await req.json();

    console.log(`[Cancel API] Checking Job: ${jobId} for User: ${userAddress}`);

    if (!message || !signature || !userAddress || !jobId || !expiresAt || !nonce) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (Date.now() > Number(expiresAt)) {
      return NextResponse.json({ error: 'Request expired' }, { status: 400 });
    }

    const nonceOk = await checkAndStoreNonce(String(nonce), userAddress, Number(expiresAt));
    if (!nonceOk) {
      return NextResponse.json({ error: 'Nonce already used' }, { status: 400 });
    }

    // =================================================================
    // ✅ 终极解决方案：使用 viem 进行验证
    // viem 会自动检测地址是 EOA 还是 Smart Wallet。
    // 如果是 Smart Wallet，它会自动调用链上的 EIP-1271 isValidSignature 方法。
    // =================================================================
    const valid = await publicClient.verifyMessage({
      address: userAddress as `0x${string}`,
      message: message,
      signature: signature as `0x${string}`,
    });

    if (!valid) {
      console.error(`[Cancel API] Signature validation failed for ${userAddress}`);
      // 这是最可能的失败原因：ethers 无法处理智能钱包，但 viem 可以。
      // 如果 viem 也失败，说明签名内容真的被篡改了，或者链网络不通。
      return NextResponse.json({ error: 'Invalid signature (EIP-1271 check failed)' }, { status: 401 });
    }

    // --- 验证通过，下面是正常的数据库逻辑 ---

    // 1. 验证归属权
    const { data: job } = await supabaseAdmin
      .from('dca_jobs')
      .select('user_address')
      .eq('id', jobId)
      .single();

    if (!job || job.user_address.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. 执行取消
    const { error: updateError } = await supabaseAdmin
      .from('dca_jobs')
      .update({ status: 'CANCELLED' })
      .eq('id', jobId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Cancel API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
>>>>>>> 5cd363bb994f0fd88d630a5340afb06e48edefab
}