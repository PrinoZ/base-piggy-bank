'use client';

import { useEffect } from 'react';

async function callReadyOnce() {
  try {
    // Base host (if present)
    // @ts-ignore
    const baseReadyFn = window?.base?.actions?.ready || window?.base?.miniapp?.actions?.ready;
    if (typeof baseReadyFn === 'function') {
      await Promise.resolve(baseReadyFn());
      return true;
    }
  } catch {}

  try {
    const mod: any = await import('@farcaster/frame-sdk');
    const sdk = mod?.sdk || mod?.default?.sdk || mod?.default || mod;
    const readyFn = sdk?.actions?.ready;
    if (typeof readyFn === 'function') {
      await Promise.resolve(readyFn());
      return true;
    }
  } catch {}

  return false;
}

export function ReadyHandshake() {
  useEffect(() => {
    let done = false;
    let cancelled = false;

    const run = async () => {
      if (cancelled || done) return;
      const ok = await callReadyOnce();
      if (ok) done = true;
    };

    // Call ASAP, then retry a few times (embedded webviews can be flaky during boot).
    run();
    const t0 = setTimeout(run, 50);
    const t1 = setTimeout(run, 250);
    const t2 = setTimeout(run, 750);
    const interval = setInterval(run, 1000);

    const stop = setTimeout(() => {
      done = true;
      clearInterval(interval);
    }, 15000);

    return () => {
      cancelled = true;
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(stop);
      clearInterval(interval);
    };
  }, []);

  return null;
}


