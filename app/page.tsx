// @ts-nocheck
'use client';

import { supabase } from '@/lib/supabaseClient';
import { ethers } from 'ethers'; 
import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Wallet, TrendingUp, Calendar, DollarSign, Clock, Trophy, ChevronRight, Activity, BarChart2, Layers, PiggyBank, LayoutGrid, XCircle, RefreshCw, Plus, ChevronDown, ChevronUp } from 'lucide-react';

// ==========================================
//              CONSTANTS & TYPES
// ==========================================

const BASE_CHAIN_ID = '0x2105'; // 8453 in hex
const BASE_RPC_URL = 'https://mainnet.base.org';

const CURRENT_ASSET_PRICE = 64000; 
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; 
const CBBTC_ADDRESS = "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf"; 
const DCA_CONTRACT_ADDRESS = "0x9432f3cf09e63d4b45a8e292ad4d38d2e677ad0c";

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function decimals() view returns (uint8)"
];

const FREQUENCIES = [
  { label: 'Daily', days: 1, value: 'Daily' },
  { label: '3 Days', days: 3, value: '3 Days' },
  { label: 'Weekly', days: 7, value: 'Weekly' },
  { label: 'Bi-Weekly', days: 14, value: 'Bi-Weekly' }
];

const getFutureDateLabel = (monthsToAdd: number) => {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsToAdd);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

// ==========================================
//              COMPONENTS
// ==========================================

const StatBox = ({ label, value, subValue, highlight, isPositive }: any) => (
  <div className="flex flex-col bg-white p-2 rounded-lg border border-slate-200 flex-1 min-w-0">
    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider truncate">{label}</span>
    <div className={`text-base font-extrabold leading-tight truncate ${highlight ? (isPositive ? 'text-green-700' : 'text-slate-900') : 'text-slate-900'}`}>
      {value}
    </div>
    {subValue && <div className="text-[10px] font-bold text-slate-500">{subValue}</div>}
  </div>
);

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

// --- 核心修改：PlanCard 组件 ---
const PlanCard = ({ job, isTemplate = false, onCancel, isLoading }: any) => {
    // 状态：控制卡片是否展开
    const [isExpanded, setIsExpanded] = useState(false);

    // 计算逻辑（模拟数据，实际需从链上或数据库读）
    // 假设：累计投入 = (当前时间 - 创建时间) / 频率 * 金额
    // 这里为了演示，我们简单模拟一个累计值
    const accumulatedBTC = isTemplate ? 0 : 0.0042; // 示例数据
    const accumulatedUSD = accumulatedBTC * CURRENT_ASSET_PRICE;
    
    // 计算截止日期 (假设定投默认是长期，或者根据 duration 算)
    // 这里简单展示为 "Unlimited" 或者 "1 Year from now"
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    return (
        <div 
            className={`bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden transition-all duration-300 ${isTemplate ? 'opacity-40 blur-[2px] grayscale' : 'cursor-pointer hover:shadow-md'}`}
            // 点击卡片切换展开状态
            onClick={() => !isTemplate && setIsExpanded(!isExpanded)}
        >
            {/* 背景装饰 */}
            <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                <Activity size={80} className="text-blue-600" />
            </div>
            
            {/* 卡片头部 (一直显示) */}
            <div className="p-5 pb-3 relative z-10">
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
                    {/* 展开/收起 指示器 */}
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

            {/* 展开详情区域 (动画显示) */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out relative z-10 ${isExpanded ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-5 pb-5 pt-0">
                    <div className="w-full h-px bg-slate-100 my-3"></div>
                    
                    {/* 新增详情：累计收益 & 截止日期 */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Total Assets</p>
                            <div className="text-sm font-black text-slate-900">{accumulatedBTC.toFixed(4)} <span className="text-[10px] text-slate-400 font-bold">cbBTC</span></div>
                            <div className="text-[10px] font-bold text-green-600">≈ ${accumulatedUSD.toFixed(2)}</div>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">End Date</p>
                            <div className="text-sm font-bold text-slate-700">Open-ended</div> 
                            <div className="text-[10px] text-slate-400">(Auto-renew)</div>
                        </div>
                    </div>

                    {/* 缩小并移动后的 Cancel 按钮 */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation(); // 防止点击按钮时触发卡片折叠
                            !isTemplate && onCancel(job.id);
                        }}
                        disabled={isTemplate || isLoading}
                        className="w-full py-2 rounded-lg border border-red-100 bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 transition-all flex items-center justify-center gap-1.5"
                    >
                        <XCircle size={14} />
                        {isLoading ? 'Processing...' : 'Stop & Cancel Plan'}
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
  const [account, setAccount] = useState(''); 
  const [isLoading, setIsLoading] = useState(false); 
  const [activeJob, setActiveJob] = useState(null); 
  
  // Strategy State
  const [amount, setAmount] = useState<number | ''>(100);
  
  // --- 修改点 1：默认 Frequency 设为 Daily (Index 0) ---
  const [freqIndex, setFreqIndex] = useState(0); 
  
  const [duration, setDuration] = useState(12); 
  const [projectedPrice, setProjectedPrice] = useState(85000);
  
  // --- Effects ---
  useEffect(() => {
    const init = async () => {
        const acc = await connectWallet(true); // silent connect
        if (acc) fetchActiveJob(acc);
    };
    init();
  }, []);

  // --- Calculation Results ---
  const calculation = useMemo(() => {
    const safeAmount = amount === '' ? 0 : amount;
    const selectedFreq = FREQUENCIES[freqIndex];
    const investmentsPerMonth = 30 / selectedFreq.days; 
    const monthlyAmount = safeAmount * investmentsPerMonth;
    const totalInvested = monthlyAmount * duration;
    
    const data = [];
    let accumulatedCoins = 0;
    const startPrice = CURRENT_ASSET_PRICE;
    const endPrice = projectedPrice;
    
    for (let i = 0; i <= duration; i++) {
      const progress = i / duration;
      const currentPrice = startPrice + (endPrice - startPrice) * progress;
      if (i > 0) accumulatedCoins += monthlyAmount / currentPrice;
      data.push({
        month: i,
        dateLabel: getFutureDateLabel(i),
        coins: accumulatedCoins,
        value: accumulatedCoins * currentPrice,
        price: currentPrice
      });
    }

    const finalValue = accumulatedCoins * endPrice;
    const profit = finalValue - totalInvested;
    const roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

    return { data, totalInvested, finalValue, profit, roi, totalCoins: accumulatedCoins };
  }, [amount, freqIndex, duration, projectedPrice]);

  // --- Functions ---

  const fetchActiveJob = async (userAddr = account) => {
    if (!userAddr) return;
    try {
      const normalizedAddr = userAddr.toLowerCase();

      const { data, error } = await supabase
        .from('dca_jobs')
        .select('*')
        .eq('user_address', normalizedAddr) 
        .eq('status', 'ACTIVE')
        .maybeSingle();
      
      if (error) {
          console.error("Supabase Read Error:", error);
      }

      if (data) {
          setActiveJob(data);
      } else {
          setActiveJob(null);
      }
    } catch (error) {
      console.error("Error fetching job:", error);
    }
  };

  const switchToBase = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_CHAIN_ID }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
                chainId: BASE_CHAIN_ID,
                chainName: 'Base Mainnet',
                rpcUrls: [BASE_RPC_URL],
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                blockExplorerUrls: ['https://basescan.org'],
            }],
          });
        } catch (addError) { throw new Error('Please manually switch to Base network.'); }
      } else { throw new Error('Please switch to Base network.'); }
    }
  };

  const connectWallet = async (silent = false) => {
      if (typeof window.ethereum !== 'undefined') {
          try {
              const method = silent ? 'eth_accounts' : 'eth_requestAccounts';
              const accounts = await window.ethereum.request({ method });
              if (accounts[0]) {
                  setAccount(accounts[0]);
                  return accounts[0];
              }
          } catch (error) { console.error(error); }
      } else if (!silent) {
          alert('Please install Coinbase Wallet or MetaMask');
      }
      return null;
  };

  const handleStartDCA = async () => {
    setIsLoading(true);
    let currentAccount = account;

    try {
        if (!window.ethereum) throw new Error("No wallet found");
        if (!currentAccount) {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (!accounts || accounts.length === 0) throw new Error("Wallet not connected");
            currentAccount = accounts[0];
            setAccount(currentAccount);
        }

        const normalizedAccount = currentAccount.toLowerCase();

        await switchToBase(); 

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
        
        // 1. Check Allowance
        const requiredAmount = ethers.parseUnits(amount.toString(), 6);
        console.log(`Checking allowance for user: ${normalizedAccount}`);
        const allowance = await usdcContract.allowance(normalizedAccount, DCA_CONTRACT_ADDRESS);
        
        if (allowance < requiredAmount) {
            alert("⚠️ First time setup: You need to approve USDC usage.\nPlease confirm the transaction in your wallet.");
            const approveTx = await usdcContract.approve(DCA_CONTRACT_ADDRESS, ethers.MaxUint256);
            console.log("Approval tx sent:", approveTx.hash);
            await approveTx.wait();
            console.log("Approval confirmed on chain!");
        }

        // 2. Sign Message
        const message = `Confirm DCA Plan Creation:
-------------------------
Token: USDC -> cbBTC
Amount: $${amount}
Frequency: ${FREQUENCIES[freqIndex].label}
-------------------------
Your first trade will happen immediately via our bot.`;

        await signer.signMessage(message);

        // 3. Register User & Job
        const { error: userError } = await supabase
            .from('users')
            .upsert({ wallet_address: normalizedAccount }, { onConflict: 'wallet_address' });
        if (userError) console.error("Supabase User Error:", userError);

        const selectedFreq = FREQUENCIES[freqIndex];
        const frequencyInSeconds = selectedFreq.days * 24 * 60 * 60; 

        const { data: insertedJob, error: jobError } = await supabase
            .from('dca_jobs')
            .insert([{
                user_address: normalizedAccount,
                token_in: USDC_ADDRESS,
                token_out: CBBTC_ADDRESS,
                amount_per_trade: Number(amount),
                frequency_seconds: frequencyInSeconds,
                status: 'ACTIVE',
                next_run_time: new Date().toISOString() 
            }])
            .select()
            .single();

        if (jobError) throw jobError;

        alert(`🎉 Success! Plan Created.\n\nThe bot will execute your first buy of $${amount} shortly.`);
        
        if (insertedJob) {
            setActiveJob(insertedJob);
        } else {
            await fetchActiveJob(normalizedAccount); 
        }
        
        setActiveTab('assets'); 

    } catch (err: any) {
        console.error("DCA Error:", err);
        if (err.code !== "ACTION_REJECTED" && err.info?.error?.code !== 4001) {
             alert("Error: " + (err.shortMessage || err.message));
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleCancelPlan = async (jobId: any) => {
    const confirmCancel = window.confirm("Are you sure you want to stop this plan?");
    if (!confirmCancel) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('dca_jobs')
        .update({ status: 'CANCELLED' })
        .eq('id', jobId);

      if (error) throw error;
      
      fetchActiveJob(account); 
    } catch (error) {
      alert("Failed to cancel plan");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-white text-slate-900 font-sans overflow-hidden max-w-md mx-auto shadow-2xl">
      
      {/* --- Header --- */}
      <header className="flex-none h-12 px-4 border-b border-slate-200 flex justify-between items-center bg-white z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
            <PiggyBank size={16} />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-900 leading-tight">Base piggy bank</h1>
            {account ? (
                <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    <span className="text-[10px] font-bold text-slate-500 font-mono">
                        {account.slice(0, 6)}...{account.slice(-4)}
                    </span>
                </div>
            ) : (
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => connectWallet(false)}>
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-bold text-blue-600">Connect Wallet</span>
                </div>
            )}
          </div>
        </div>
        <div className="w-8"></div> 
      </header>

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col min-h-0 bg-white">
        
        {/* === TAB 1: STRATEGY === */}
        {activeTab === 'strategy' && (
          <>
            <div className="flex-none h-[32%] w-full bg-slate-50 border-b border-slate-200 flex flex-col relative">
              <div className="px-5 pt-4 pb-1 flex-none flex justify-between items-start">
                <div>
                    <div className="flex items-baseline gap-1">
                        <div className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
                           {calculation.totalCoins.toFixed(4)}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">cbBTC</span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 mt-1">Accumulated Assets</div>
                </div>
                <div className={`text-right px-2 py-1 rounded-lg border ${calculation.roi >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className={`text-lg font-black leading-none ${calculation.roi >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {calculation.roi > 0 ? '+' : ''}{calculation.roi.toFixed(1)}%
                    </div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase">Proj. ROI</div>
                </div>
              </div>
              <div className="flex-1 min-h-0 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={calculation.data} margin={{ top: 5, right: 35, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorCoins" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" minTickGap={30} />
                    <YAxis hide={false} axisLine={false} tickLine={false} width={35} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} />
                    <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', fontSize: '11px', color: 'white', padding: '8px' }} itemStyle={{ padding: 0 }} formatter={(val: any) => [`${Number(val).toFixed(4)}`, 'cbBTC']} labelFormatter={(label) => `Date: ${label}`} labelStyle={{ color: '#94a3b8', marginBottom: '4px' }} />
                    <Area type="monotone" dataKey="coins" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorCoins)" animationDuration={1000} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex-1 flex flex-col p-4 bg-white min-h-0">
              <div className="flex gap-3 mb-4 flex-none">
                  <StatBox label="Total Invested" value={`$${Math.round(calculation.totalInvested).toLocaleString()}`} />
                  <StatBox label="Est. Value" value={`$${Math.round(calculation.finalValue).toLocaleString()}`} highlight isPositive={calculation.profit >= 0} />
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1">
                <div>
                  <label className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Amount per Trade</span>
                    <span className="text-slate-500 font-medium">USDC</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-800 font-bold">$</span>
                    <input type="number" value={amount} placeholder="0" onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-slate-100 border border-slate-200 text-slate-900 font-bold text-lg rounded-xl py-3 pl-7 pr-3 focus:ring-2 focus:ring-blue-600 outline-none transition-all" />
                  </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Frequency</label>
                    <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-lg">
                      {FREQUENCIES.map((freq, idx) => (
                        <button key={freq.value} onClick={() => setFreqIndex(idx)} className={`py-2 rounded-md text-[10px] font-bold transition-all leading-tight ${freqIndex === idx ? 'bg-white text-blue-700 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}>
                          {freq.label}
                        </button>
                      ))}
                    </div>
                </div>
                <div className="space-y-3 pt-1">
                  <CompactSlider label="Duration" value={duration} min={1} max={48} unit="Months" onChange={setDuration} />
                  <CompactSlider label="Predict BTC" value={projectedPrice} min={CURRENT_ASSET_PRICE} max={200000} unit="$" onChange={setProjectedPrice} />
                </div>
              </div>

              <div className="mt-2 mb-0 pt-2 border-t border-slate-100 flex-none text-center">
                <button className={`w-full text-white font-bold text-lg py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all ${isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 active:bg-blue-700 active:scale-[0.98] shadow-blue-600/20'}`} onClick={handleStartDCA} disabled={isLoading}>
                  {isLoading ? 'Processing...' : (<>Start DCA <ChevronRight size={20} /></>)}
                </button>
                <p className="text-[10px] text-slate-400 mt-2 px-2 font-medium">This is a non-custodial protocol. We don't hold any user funds.</p>
              </div>
            </div>
          </>
        )}

        {/* === TAB 2: ASSETS (我的定投卡片) === */}
        {activeTab === 'assets' && (
            <div className="flex flex-col h-full bg-slate-50 p-4 overflow-y-auto relative">
                <div className="flex justify-between items-center mb-4 px-1">
                    <h2 className="text-lg font-black text-slate-900">My Active Plans</h2>
                    <button 
                        onClick={() => fetchActiveJob(account)}
                        className="p-2 bg-white rounded-full text-slate-500 shadow-sm hover:text-blue-600 hover:rotate-180 transition-all"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
                
                {activeJob ? (
                    // 1. 如果有计划，显示真实卡片
                    <PlanCard job={activeJob} onCancel={handleCancelPlan} isLoading={isLoading} />
                ) : (
                    // 2. 如果没有计划，显示"Ghost Card" (模板) + 覆盖层
                    <div className="relative">
                        {/* 底部的虚幻卡片 */}
                        <PlanCard isTemplate={true} />
                        
                        {/* 覆盖在上面的 CTA (Call To Action) */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                            <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-slate-100 text-center max-w-[80%]">
                                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Plus size={24} />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 mb-1">No active plans</h3>
                                <p className="text-[10px] text-slate-500 font-medium mb-3 leading-tight">
                                    Start your auto-investment journey today.
                                </p>
                                <button 
                                    onClick={() => setActiveTab('strategy')}
                                    className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                                >
                                    Create your first plan
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-6 px-2">
                    <p className="text-[10px] text-slate-400 text-center">
                        Note: If you approved USDC but didn't sign the creation message, your plan is not active.
                    </p>
                </div>
            </div>
        )}

        {/* === TAB 3: LEADERBOARD === */}
        {activeTab === 'leaderboard' && (
          <div className="flex flex-col h-full bg-slate-50 relative">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-5 text-white shadow-lg mb-4">
                <div className="flex justify-between items-start">
                  <div>
                      <p className="text-blue-100 text-xs font-bold uppercase mb-1">Your Rank</p>
                      <h2 className="text-4xl font-black">#142</h2>
                      <p className="text-sm font-semibold mt-2 opacity-90 inline-block bg-white/20 px-2 py-0.5 rounded text-white">Shrimp Tier 🦐</p>
                  </div>
                  <Trophy className="text-yellow-400 opacity-80" size={40} />
                </div>
              </div>
              
              {/* Leaderboard List */}
              <div className="space-y-2">
                {[1,2,3,4,5,6,7,8,9,10].map((i) => (
                  <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i <= 3 ? 'bg-yellow-100 text-yellow-800 ring-2 ring-yellow-400/20' : 'bg-slate-100 text-slate-600'}`}>
                        {i}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">User_{9900+i}.base</div>
                        <div className="text-[10px] text-slate-500 font-medium">Daily DCA • $50</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 text-sm font-mono">{(10.5 - i * 0.5).toFixed(4)} <span className="text-[10px] text-slate-400">cbBTC</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- Bottom Navigation --- */}
      <nav className="flex-none bg-white border-t border-slate-200 pb-safe z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16">
          <button onClick={() => setActiveTab('strategy')} className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'strategy' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
            <BarChart2 size={24} strokeWidth={activeTab === 'strategy' ? 3 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-wide">Strategy</span>
          </button>
          
          <div className="w-px h-8 bg-slate-100"></div>

          <button onClick={() => setActiveTab('assets')} className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'assets' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
            <Wallet size={24} strokeWidth={activeTab === 'assets' ? 3 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-wide">Assets</span>
          </button>

          <div className="w-px h-8 bg-slate-100"></div>

          <button onClick={() => setActiveTab('leaderboard')} className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'leaderboard' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
            <Layers size={24} strokeWidth={activeTab === 'leaderboard' ? 3 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-wide">Rank</span>
          </button>

        </div>
      </nav>

    </div>
  );
}