// @ts-nocheck
'use client';

import { supabase } from '@/lib/supabaseClient';
import { ethers } from 'ethers'; 
import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Wallet, TrendingUp, Calendar, DollarSign, Clock, Trophy, ChevronRight, Activity, BarChart2, Layers, PiggyBank, LayoutGrid, XCircle, RefreshCw, Plus, ChevronDown, ChevronUp, Share2, AlertTriangle, ExternalLink, Info } from 'lucide-react';

// === ✅ 关键修改 1: 引入 RainbowKit 和 Wagmi ===
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useChainId, useSwitchChain } from 'wagmi';
import { parseAbi } from 'viem'; // 用于处理 ABI 兼容性
import { useEthersSigner } from '../lib/ethers-adapter';

// === CONSTANTS ===
const CURRENT_ASSET_PRICE = 96000; 
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; 
const CBBTC_ADDRESS = "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf"; 
const DCA_CONTRACT_ADDRESS = "0x9432f3cf09e63d4b45a8e292ad4d38d2e677ad0c";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');

// === ✅ 关键修改 2: ABI 兼容性修复 ===
// Ethers 可以直接吃字符串数组，但 Wagmi 需要用 parseAbi 转换
const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() view returns (uint8)"
]);

const FREQUENCIES = [
  { label: 'Daily', days: 1, value: 'Daily' },
  { label: '3 Days', days: 3, value: '3 Days' },
  { label: 'Weekly', days: 7, value: 'Weekly' },
  { label: 'Bi-Weekly', days: 14, value: 'Bi-Weekly' }
];

// === HELPERS (保持不变) ===
const getFutureDateLabel = (monthsToAdd: number) => {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsToAdd);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

const shortenAddress = (addr: string) => {
    if (!addr) return 'Unknown';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

const getTier = (amount: number) => {
    if (amount >= 1000) return 'Whale 🐋';
    if (amount >= 500) return 'Shark 🦈';
    if (amount >= 100) return 'Dolphin 🐬';
    return 'Shrimp 🦐';
};

const CompactSlider = ({ label, value, min, max, onChange, unit }: any) => (
  <div className="w-full">
    <div className="flex justify-between items-center mb-1">
      <span className="text-xs font-bold text-slate-700">{label}</span>
      <span className="text-xs font-bold text-blue-700">{unit === '$' ? `$${value.toLocaleString()}` : `${value} ${unit}`}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
    />
  </div>
);

// === COMPONENTS (PlanCard 保持不变) ===
const PlanCard = ({ job, isTemplate = false, onCancel, isLoading, usdcBalance, refreshTrigger }: any) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [realStats, setRealStats] = useState({ btc: 0, usd: 0, endDate: 'N/A' });

    const fetchRealStats = async () => {
        if (isTemplate || !job?.id) return;
        const startTime = new Date(job.created_at);
        const endDateObj = new Date(startTime);
        endDateObj.setMonth(endDateObj.getMonth() + 12); 

        const { data, error } = await supabase
            .from('dca_transactions')
            .select('amount_usdc')
            .eq('job_id', job.id)
            .eq('status', 'SUCCESS');

        if (!error && data) {
            const totalUsd = data.reduce((acc, curr) => acc + (Number(curr.amount_usdc) || 0), 0);
            const estimatedBtc = totalUsd / CURRENT_ASSET_PRICE;
            setRealStats({ usd: totalUsd, btc: estimatedBtc, endDate: endDateObj.toLocaleDateString() });
        }
    };

    const fetchHistory = async () => {
        if (isTemplate || !job?.id) return;
        setLoadingHistory(true);
        const { data, error } = await supabase
            .from('dca_transactions')
            .select('*')
            .eq('job_id', job.id)
            .order('created_at', { ascending: false })
            .limit(10);
        if (!error) setHistory(data || []);
        setLoadingHistory(false);
    };

    useEffect(() => {
        fetchRealStats(); 
        if (isExpanded || refreshTrigger > 0) {
            fetchHistory();
            fetchRealStats(); 
        }
    }, [isExpanded, refreshTrigger, job?.id]);

    const isLowBalance = !isTemplate && usdcBalance !== null && Number(usdcBalance) < Number(job?.amount_per_trade);

    const handleShare = async (e: any) => {
        e.stopPropagation(); 
        const text = `I'm auto-investing cbBTC via @BasePiggyBank! 🐷\n\nAccumulated: ${realStats.btc.toFixed(4)} BTC\nInvested: $${realStats.usd}\n\nStart your journey on Base! 🚀`;
        // 引导到具备 OG/Frame 预览的页面（主页或 /embed），让社交平台抓取 og-image
        const url = `${APP_URL || window.location.origin}/`;
        try {
            if (navigator.share) await navigator.share({ title: 'Base Piggy Bank', text: text, url });
            else throw new Error("Share API not supported");
        } catch (error) {
            try {
                await navigator.clipboard.writeText(`${text}\n${url}`);
                alert("📋 Results copied to clipboard!");
            } catch (c) { alert("Failed to copy."); }
        }
    };

    const handleCancelClick = (e: any) => {
        e.stopPropagation();
        e.preventDefault();
        if (!isTemplate && onCancel && job?.id) {
            onCancel(job.id);
        }
    };

    return (
        <div 
            className={`bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden transition-all duration-300 ${isTemplate ? 'opacity-40 blur-[2px] grayscale' : 'cursor-pointer hover:shadow-md'}`}
            onClick={() => !isTemplate && setIsExpanded(!isExpanded)}
        >
             <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                <Activity size={80} className="text-blue-600" />
            </div>
            
            <div className="p-5 pb-3 relative z-10">
                {isLowBalance && (
                    <div className="mb-3 bg-red-50 border border-red-100 rounded-lg p-2 flex items-start gap-2 animate-pulse">
                        <AlertTriangle className="text-red-500 shrink-0" size={16} />
                        <p className="text-[10px] font-bold text-red-600 leading-tight">Insufficient Balance. Next trade may fail.</p>
                    </div>
                )}

                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                            <Activity size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-slate-900">USDC <span className="text-slate-400 mx-1">→</span> cbBTC</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`w-2 h-2 rounded-full ${isTemplate ? 'bg-slate-400' : 'bg-green-500 animate-pulse'}`}></span>
                                <span className={`text-[10px] font-bold uppercase tracking-wide ${isTemplate ? 'text-slate-500' : 'text-green-600'}`}>
                                    {isTemplate ? 'Example Plan' : 'Active Running'}
                                </span>
                            </div>
                        </div>
                    </div>
                    {!isTemplate && (
                        <div className="text-slate-400">
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Amount / Trade</p>
                        <p className="text-lg font-black text-slate-900">${job?.amount_per_trade || 100}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Next Run</p>
                        <p className="text-sm font-bold text-slate-700 mt-1">
                            {isTemplate ? 'Immediately' : new Date(job?.next_run_time).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            </div>

            <div className={`overflow-hidden transition-all duration-300 ease-in-out relative z-10 ${isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-5 pb-5 pt-0">
                    <div className="w-full h-px bg-slate-100 my-3"></div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Accumulated</p>
                            <div className="text-sm font-black text-slate-900">{realStats.btc.toFixed(6)} <span className="text-[10px] text-slate-400 font-bold">cbBTC</span></div>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Ends On</p>
                            <div className="text-sm font-bold text-slate-700">{realStats.endDate}</div> 
                        </div>
                    </div>

                    <button onClick={handleShare} className="w-full mb-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
                        <Share2 size={14} /> Share My Results
                    </button>

                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                             <p className="text-[10px] text-slate-500 font-bold uppercase">Recent Transactions</p>
                             {loadingHistory && <span className="text-[9px] text-blue-500 animate-pulse">Updating...</span>}
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden max-h-40 overflow-y-auto">
                            {history.length > 0 ? (
                                history.map((tx: any) => (
                                    <a key={tx.id} href={`https://basescan.org/tx/${tx.tx_hash}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex justify-between items-center p-3 border-b border-slate-100 last:border-0 hover:bg-slate-100/80 transition-colors cursor-pointer block">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${tx.status === 'SUCCESS' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            <div className="flex flex-col">
                                                <span className={`text-[10px] font-bold ${tx.status === 'SUCCESS' ? 'text-slate-700' : 'text-red-600'}`}>{tx.status}</span>
                                                <span className="text-[8px] text-slate-400">{new Date(tx.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono text-slate-500">${tx.amount_usdc}</span>
                                            <ExternalLink size={10} className="text-blue-600"/>
                                        </div>
                                    </a>
                                ))
                            ) : (
                                <div className="p-4 text-center text-[10px] text-slate-400">{loadingHistory ? "Loading..." : "No transactions found."}</div>
                            )}
                        </div>
                    </div>

                    <button 
                        onClick={handleCancelClick}
                        onTouchEnd={handleCancelClick} 
                        disabled={isTemplate || isLoading}
                        className="w-full py-3 rounded-lg border border-red-100 bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 transition-all flex items-center justify-center gap-1.5 relative z-50 cursor-pointer active:scale-95"
                    >
                        <XCircle size={14} />
                        Stop & Cancel Plan
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==========================================
//              MAIN APP
// ==========================================

export default function App() {
  const [activeTab, setActiveTab] = useState('strategy'); 
  
  // === ✅ 关键修改 3: 使用 RainbowKit / Wagmi Hooks ===
  const { address, isConnected } = useAccount(); // 替代 const [account, setAccount]
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  
  // 使用我们自定义的 adapter 获取 Ethers Signer (用于 write 操作)
  const signer = useEthersSigner(); 
  
  // 使用 Wagmi 自动获取余额 (Read 操作)
  const { data: balanceData } = useReadContract({ 
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
        enabled: !!address, // 只有连接时才查询
        refetchInterval: 10000 // 每10秒刷新一次
    }
  });

  // 将 wagmi 的余额 (BigInt) 转为字符串显示
  const usdcBalance = useMemo(() => {
    if (balanceData) return ethers.formatUnits(balanceData, 6);
    return null;
  }, [balanceData]);

  const [isLoading, setIsLoading] = useState(false); 
  const [isRefreshing, setIsRefreshing] = useState(false); 
  const [refreshTrigger, setRefreshTrigger] = useState(0); 
  const [activeJobs, setActiveJobs] = useState<any[]>([]); 
  const [deletedIds, setDeletedIds] = useState<string[]>([]); 

  const [isMounted, setIsMounted] = useState(false); 
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [userRankData, setUserRankData] = useState<any>(null);

  const [amount, setAmount] = useState<number | ''>(100);
  const [freqIndex, setFreqIndex] = useState(0); 
  const [duration, setDuration] = useState(12); 
  const [targetGoal, setTargetGoal] = useState<number | ''>(1); 
  const [frameContext, setFrameContext] = useState<any>(null);
  const [baseContext, setBaseContext] = useState<any>(null);
  
  useEffect(() => { setIsMounted(true); }, []);

  // Base Mini App / Frame context: best-effort parse from URL search or window
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const frameCtx = params.get('frameContext');
      const baseCtx = params.get('baseContext');
      if (frameCtx) setFrameContext(JSON.parse(decodeURIComponent(frameCtx)));
      if (baseCtx) setBaseContext(JSON.parse(decodeURIComponent(baseCtx)));
      // Some hosts expose window.base?.context
      // @ts-ignore
      if (!baseCtx && window?.base?.context) setBaseContext(window.base.context);
    } catch (err) {
      console.warn('Context parse failed', err);
    }
  }, []);

  // 当连接状态变化时，自动刷新数据
  useEffect(() => {
    if (isConnected && address) {
        handleRefresh(address);
    }
  }, [isConnected, address]);

  useEffect(() => {
      if (activeTab === 'leaderboard') fetchLeaderboard();
  }, [activeTab, address]);

  const calculation = useMemo(() => {
    const safeAmount = amount === '' ? 0 : amount;
    const safeGoal = targetGoal === '' ? 1 : targetGoal; 
    const selectedFreq = FREQUENCIES[freqIndex];
    const investmentsPerMonth = 30 / selectedFreq.days; 
    const monthlyAmount = safeAmount * investmentsPerMonth;
    const totalInvested = monthlyAmount * duration;
    let accumulatedCoins = 0;
    const basePrice = CURRENT_ASSET_PRICE;
    const data = [];
    
    for (let i = 0; i <= duration; i++) {
        const cycle = Math.sin(i * 0.5) * 0.15; 
        const noise = (Math.random() - 0.5) * 0.1; 
        const trend = i * 0.01; 
        const simulatedPrice = basePrice * (1 + cycle + noise + trend);
        if (i > 0) accumulatedCoins += monthlyAmount / simulatedPrice;
        data.push({
            month: i,
            dateLabel: getFutureDateLabel(i),
            coins: accumulatedCoins,
            value: accumulatedCoins * simulatedPrice,
        });
    }
    const finalPrice = basePrice * (1 + Math.sin(duration * 0.5) * 0.15 + (Math.random() - 0.5) * 0.1 + duration * 0.01);
    const finalValue = accumulatedCoins * finalPrice;
    return { data, totalInvested, finalValue, totalCoins: accumulatedCoins, safeGoal };
  }, [amount, freqIndex, duration, targetGoal]);

  const handleRefresh = async (userAddr = address) => {
      if (!userAddr) return;
      setIsRefreshing(true);
      await fetchActiveJobs(userAddr); 
      // 余额现在由 useReadContract 自动管理，不需要手动 fetch
      setRefreshTrigger(prev => prev + 1);
      setTimeout(() => setIsRefreshing(false), 800);
  };

  const fetchLeaderboard = async () => {
      try {
          // 获取前15名用于显示
          const { data, error } = await supabase.from('leaderboard').select('*').order('total_invested', { ascending: false }).limit(15);
          if (error) throw error;
          if (data) {
              setLeaderboardData(data); 
              if (address) {
                  const normalizedAddress = address.toLowerCase();
                  const myIndex = data.findIndex(u => u.user_address.toLowerCase() === normalizedAddress);
                  
                  if (myIndex !== -1) {
                      // 用户在前15名内
                      setUserRankData({ rank: myIndex + 1, amount: data[myIndex].total_invested });
                  } else {
                      // 用户不在前15名，查询实际排名
                      const { data: allData, error: rankError } = await supabase
                          .from('leaderboard')
                          .select('user_address, total_invested')
                          .order('total_invested', { ascending: false });
                      
                      if (!rankError && allData) {
                          const actualIndex = allData.findIndex(u => u.user_address.toLowerCase() === normalizedAddress);
                          if (actualIndex !== -1) {
                              setUserRankData({ 
                                  rank: actualIndex + 1, 
                                  amount: allData[actualIndex].total_invested 
                              });
                          } else {
                              setUserRankData({ rank: 'N/A', amount: 0 });
                          }
                      } else {
                          setUserRankData({ rank: 'N/A', amount: 0 });
                      }
                  }
              }
          }
      } catch (err) { console.error("Fetch leaderboard error:", err); }
  };

  const fetchActiveJobs = async (userAddr = address) => {
    try {
      if (!userAddr) return;
      const normalizedAddr = userAddr.toLowerCase();
      
      const { data, error } = await supabase
        .from('dca_jobs')
        .select('*')
        .eq('user_address', normalizedAddr) 
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false }); 
      
      if (error) { console.error("Supabase Read Error:", error); return; }
      
      const cleanData = (data || []).filter(job => !deletedIds.includes(job.id));
      setActiveJobs(cleanData); 

    } catch (error) { console.error("Error fetching jobs:", error); }
  };

  // === 移除: switchChain 和 connectWallet (RainbowKit 自动处理) ===

  const handleStartDCA = async () => {
    if (!isConnected || !address || !signer) {
        // 触发 RainbowKit 的连接弹窗 (通过隐藏按钮的点击或其他方式，但这里简单起见，提示用户)
        alert("Please connect your wallet first.");
        return;
    }

    setIsLoading(true);
    const normalizedAccount = address.toLowerCase();

    try {
        if (!amount || Number(amount) <= 0) { alert("Please enter a valid Amount."); setIsLoading(false); return; }
      const now = Date.now();
      const expiresAt = now + 5 * 60 * 1000; // 5 分钟有效
      const nonce = crypto.randomUUID ? crypto.randomUUID() : `${now}-${Math.random()}`;
        
        // ⚠️ 使用 adapter 提供的 signer，代码与之前完全兼容
        // 即使 ERC20_ABI 用了 parseAbi，Ethers v6 也能完美兼容它
        const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
        
        const requiredAmount = ethers.parseUnits(amount.toString(), 6);
        const allowance = await usdcContract.allowance(normalizedAccount, DCA_CONTRACT_ADDRESS);
        
        if (allowance < requiredAmount) {
            const approveTx = await usdcContract.approve(DCA_CONTRACT_ADDRESS, ethers.MaxUint256);
            await approveTx.wait();
        }

        const message = `Confirm DCA Plan Creation: Token=USDC->cbBTC, Amount=$${amount}, Freq=${FREQUENCIES[freqIndex].label}, Nonce=${nonce}, ExpiresAt=${expiresAt}`;
        const signature = await signer.signMessage(message);

        const selectedFreq = FREQUENCIES[freqIndex];
        const planData = {
            token_in: USDC_ADDRESS,
            token_out: CBBTC_ADDRESS,
            amount_per_trade: Number(amount),
            frequency_seconds: selectedFreq.days * 24 * 60 * 60,
            next_run_time: new Date().toISOString()
        };

        const response = await fetch('/api/create-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, signature, userAddress: normalizedAccount, planData, expiresAt, nonce })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to create plan');

        alert(`🎉 Plan Created! Check active plans.`);
        if (result.data) {
             setActiveJobs(prev => [result.data, ...prev]);
             setRefreshTrigger(prev => prev + 1); 
        } else await handleRefresh(normalizedAccount);
        setActiveTab('assets'); 
    } catch (err: any) {
        console.error("DCA Error:", err);
        if (err.code !== "ACTION_REJECTED" && err.info?.error?.code !== 4001) alert("Error: " + (err.shortMessage || err.message));
    } finally { setIsLoading(false); }
  };

  const handleCancelPlan = async (jobId: any) => {
    if (!signer) return;
    setIsLoading(true);
    
    try {
      const now = Date.now();
      const expiresAt = now + 5 * 60 * 1000;
      const nonce = crypto.randomUUID ? crypto.randomUUID() : `${now}-${Math.random()}`;
      const message = `Authorize Cancellation of Plan ID: ${jobId}, Nonce=${nonce}, ExpiresAt=${expiresAt}`;
      const signature = await signer.signMessage(message);

      setDeletedIds(prev => [...prev, jobId]);
      setActiveJobs(prev => prev.filter(job => String(job.id) !== String(jobId)));

      const response = await fetch(`/api/cancel-plan?t=${new Date().getTime()}`, {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
          },
          body: JSON.stringify({
              message,
              signature,
              userAddress: address.toLowerCase(),
              jobId,
              expiresAt,
              nonce
          })
      });

      const result = await response.json();
      if (!response.ok) {
          console.error("Backend delete failed:", result);
      }
      // 余额会自动刷新

    } catch (error: any) { 
        console.error(error);
        if (error.code !== "ACTION_REJECTED") {
            alert("Failed to cancel: " + (error.message || "Unknown error"));
        }
    } 
    finally { setIsLoading(false); }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-white text-slate-900 font-sans overflow-hidden max-w-md mx-auto shadow-2xl">
      <header className="flex-none h-16 px-4 border-b border-slate-200 flex justify-between items-center bg-white z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md"><PiggyBank size={18} /></div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 leading-tight">Base piggy bank</h1>
            {/* 连接状态现在由 RainbowKit 按钮处理 */}
            {baseContext && (
              <p className="text-[10px] font-semibold text-blue-600">Base Mini App Context Detected</p>
            )}
          </div>
        </div>
        
        {/* === ✅ RainbowKit 按钮 === */}
        <ConnectButton 
            chainStatus="icon" 
            showBalance={false}
            accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
            }} 
        />
      </header>

      <main className="flex-1 flex flex-col min-h-0 bg-white">
        {chainId && chainId !== 8453 && (
          <div className="bg-amber-50 text-amber-800 text-xs font-semibold px-4 py-2 flex items-center justify-between border-b border-amber-100">
            <span>Switch to Base Mainnet to continue.</span>
            <button
              onClick={() => switchChain?.({ chainId: 8453 })}
              disabled={isSwitchingChain}
              className="px-2 py-1 rounded-md bg-amber-200 text-amber-900 text-[11px] font-bold hover:bg-amber-300 disabled:opacity-50"
            >
              {isSwitchingChain ? 'Switching...' : 'Switch'}
            </button>
          </div>
        )}
        {activeTab === 'strategy' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 bg-slate-50 border-b border-slate-200 flex flex-col relative min-h-0">
              <div className="px-5 pt-4 pb-2 flex-none">
                <div className="w-full">
                    <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{calculation.totalCoins.toFixed(4)}</div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">cbBTC</span>
                        <span className="text-[10px] font-bold text-slate-400">(≈ ${Math.round(calculation.totalInvested).toLocaleString()} Invested)</span>
                    </div>
                    <div className="mt-3 w-1/2">
                        <div className="flex justify-between items-end mb-1"><span className="text-[9px] font-bold text-blue-600">Goal: {calculation.safeGoal}</span><span className="text-[9px] font-bold text-slate-400">{((calculation.totalCoins / calculation.safeGoal) * 100).toFixed(0)}%</span></div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${Math.min((calculation.totalCoins / calculation.safeGoal) * 100, 100)}%` }}></div></div>
                    </div>
                </div>
              </div>
              <div className="flex-1 w-full min-h-0 flex flex-col px-1 py-2">
                <div className="flex-1 w-full min-h-[180px]"> 
                    {isMounted ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={calculation.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs><linearGradient id="colorCoins" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563EB" stopOpacity={0.25}/><stop offset="95%" stopColor="#2563EB" stopOpacity={0}/></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" minTickGap={30} />
                            <YAxis hide={false} axisLine={false} tickLine={false} width={30} tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} />
                            <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', fontSize: '11px', color: 'white', padding: '8px' }} itemStyle={{ padding: 0 }} formatter={(val: any) => [`${Number(val).toFixed(4)}`, 'cbBTC']} labelFormatter={(label) => `Date: ${label}`} labelStyle={{ color: '#94a3b8', marginBottom: '4px' }} />
                            <Area type="monotone" dataKey="coins" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorCoins)" animationDuration={1000} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">Loading Chart...</div>}
                </div>
              </div>
            </div>
            <div className="flex-none p-5 bg-white space-y-3">
              <div>
                <label className="flex justify-between text-xs font-bold text-slate-700 mb-1"><span>Target Goal</span><span className="text-slate-500 font-medium">cbBTC</span></label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-800 font-bold">🎯</span><input type="number" value={targetGoal} step="0.01" placeholder="Set a visual goal" onChange={(e) => setTargetGoal(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-slate-100 border border-slate-200 text-slate-900 font-bold text-lg rounded-xl py-3 pl-9 pr-3 focus:ring-2 focus:ring-blue-600 outline-none transition-all" /></div>
                <p className="text-[10px] text-slate-400 mt-2 px-2 font-medium text-center">This goal is for preview only and does not affect your DCA plan.</p>
              </div>
              <div>
                <label className="flex justify-between text-xs font-bold text-slate-700 mb-1"><span>Amount per Trade</span><span className="text-slate-500 font-medium">USDC</span></label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-800 font-bold">$</span><input type="number" min="0.01" step="0.01" value={amount} placeholder="Min 1" onChange={(e) => { const val = e.target.value; if (val === '') { setAmount(''); return; } const num = Number(val); if (num < 0) return; setAmount(num); }} className="w-full bg-slate-100 border border-slate-200 text-slate-900 font-bold text-lg rounded-xl py-3 pl-7 pr-3 focus:ring-2 focus:ring-blue-600 outline-none transition-all" /></div>
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Frequency</label>
                  <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-lg">
                    {FREQUENCIES.map((freq, idx) => (<button key={freq.value} onClick={() => setFreqIndex(idx)} className={`py-2 rounded-md text-[10px] font-bold transition-all leading-tight ${freqIndex === idx ? 'bg-white text-blue-700 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}>{freq.label}</button>))}
                  </div>
              </div>
              <div className="pt-1"><CompactSlider label="Duration" value={duration} min={1} max={48} unit="Months" onChange={setDuration} /></div>
              <div className="pt-1">
                {/* 这里的按钮逻辑现在只负责触发 handleStartDCA，如果没连接，函数内部会拦截 */}
                <button className={`w-full text-white font-bold text-lg py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all ${isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 active:bg-blue-700 active:scale-[0.98] shadow-blue-600/20'}`} onClick={handleStartDCA} disabled={isLoading}>
                  {isLoading ? 'Processing...' : (!isConnected ? 'Connect Wallet to Start' : (<>Start DCA <ChevronRight size={20} /></>))}
                </button>
                <p className="text-[10px] text-slate-400 mt-2 px-2 font-medium text-center">This is a non-custodial protocol. We don't hold any user funds.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
            <div className="flex flex-col h-full bg-slate-50 p-4 overflow-y-auto relative">
                <div className="flex justify-between items-center mb-4 px-1">
                    <h2 className="text-lg font-black text-slate-900">My Active Plans ({activeJobs.filter(j => !deletedIds.includes(j.id)).length})</h2>
                    <button onClick={() => handleRefresh(address)} className={`p-2 bg-white rounded-full text-slate-500 shadow-sm hover:text-blue-600 transition-all ${isRefreshing ? 'animate-spin' : ''}`}><RefreshCw size={16} /></button>
                </div>
                {activeJobs.filter(job => !deletedIds.includes(job.id)).length > 0 ? (
                    <div className="space-y-4"> 
                        {activeJobs.filter(job => !deletedIds.includes(job.id)).map((job) => (
                            <PlanCard key={job.id} job={job} onCancel={handleCancelPlan} isLoading={isLoading} usdcBalance={usdcBalance} refreshTrigger={refreshTrigger} />
                        ))}
                    </div>
                ) : (
                    <div className="relative">
                        <PlanCard isTemplate={true} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                            <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-slate-100 text-center max-w-[80%]">
                                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3"><Plus size={24} /></div>
                                <h3 className="text-sm font-black text-slate-900 mb-1">No active plans</h3>
                                <p className="text-[10px] text-slate-500 font-medium mb-3 leading-tight">Start your auto-investment journey today.</p>
                                <button onClick={() => setActiveTab('strategy')} className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all">Create your first plan</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="flex flex-col h-full bg-slate-50 relative">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-5 text-white shadow-lg mb-4">
                <div className="flex justify-between items-start">
                  <div><p className="text-blue-100 text-xs font-bold uppercase mb-1">Your Rank</p><h2 className="text-4xl font-black">{userRankData ? `#${userRankData.rank}` : '-'}</h2><p className="text-sm font-semibold mt-2 opacity-90 inline-block bg-white/20 px-2 py-0.5 rounded text-white">{userRankData ? getTier(userRankData.amount) : 'Join to Rank'}</p></div>
                  <Trophy className="text-yellow-400 opacity-80" size={40} />
                </div>
              </div>
              <div className="space-y-2">
                {leaderboardData.length > 0 ? (
                    leaderboardData.map((user: any, index: number) => (
                      <div key={user.user_address} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index < 3 ? 'bg-yellow-100 text-yellow-800 ring-2 ring-yellow-400/20' : 'bg-slate-100 text-slate-600'}`}>{index + 1}</div>
                          <div><div className="font-bold text-slate-900 text-sm">{shortenAddress(user.user_address)}</div><div className="text-[10px] text-slate-500 font-medium">Trades: {user.total_trades}</div></div>
                        </div>
                        <div className="text-right"><div className="font-bold text-slate-900 text-sm font-mono">${user.total_invested} <span className="text-[10px] text-slate-400 font-sans">USDC</span></div></div>
                      </div>
                    ))
                ) : <div className="text-center text-slate-400 text-sm py-10">Loading Rankings...</div>}
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="flex-none bg-white border-t border-slate-200 pb-safe z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16">
          <button onClick={() => setActiveTab('strategy')} className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'strategy' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><BarChart2 size={24} strokeWidth={activeTab === 'strategy' ? 3 : 2} /><span className="text-[10px] font-bold uppercase tracking-wide">Strategy</span></button>
          <div className="w-px h-8 bg-slate-100"></div>
          <button onClick={() => setActiveTab('assets')} className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'assets' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><Wallet size={24} strokeWidth={activeTab === 'assets' ? 3 : 2} /><span className="text-[10px] font-bold uppercase tracking-wide">Assets</span></button>
          <div className="w-px h-8 bg-slate-100"></div>
          <button onClick={() => setActiveTab('leaderboard')} className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'leaderboard' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><Layers size={24} strokeWidth={activeTab === 'leaderboard' ? 3 : 2} /><span className="text-[10px] font-bold uppercase tracking-wide">Rank</span></button>
        </div>
      </nav>
    </div>
  );
}