// @ts-nocheck
'use client';

import { supabase } from '@/lib/supabaseClient';
import { ethers } from 'ethers'; 
import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Wallet, TrendingUp, Calendar, DollarSign, Clock, Trophy, ChevronRight, Activity, BarChart2, Layers, PiggyBank } from 'lucide-react';

// ==========================================
//              CONSTANTS & TYPES
// ==========================================

const CURRENT_ASSET_PRICE = 64000; // 模拟 BTC 当前价格
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC
const CBBTC_ADDRESS = "0xcbB7C0000ab88B473b1f5aFd9ef808440eed33Bf"; // Base cbBTC

const FREQUENCIES = [
  { label: 'Daily', days: 1, value: 'Daily' },
  { label: '3 Days', days: 3, value: '3 Days' },
  { label: 'Weekly', days: 7, value: 'Weekly' },
  { label: 'Bi-Weekly', days: 14, value: 'Bi-Weekly' }
];

// 辅助函数：生成未来日期标签
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
      // 保持 h-3 的滑块高度
      className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
    />
  </div>
);

// ==========================================
//              MAIN APP
// ==========================================

export default function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState('strategy'); // 'strategy' | 'leaderboard'
  const [account, setAccount] = useState(''); // 存储用户钱包地址
  const [isLoading, setIsLoading] = useState(false); // 加载状态
  
  // Strategy State
  const [amount, setAmount] = useState<number | ''>(100);
  const [freqIndex, setFreqIndex] = useState(2); // Default Weekly (Index 2)
  const [duration, setDuration] = useState(12); // Months
  const [projectedPrice, setProjectedPrice] = useState(85000);
  
  // Calculation Results
  const calculation = useMemo(() => {
    const safeAmount = amount === '' ? 0 : amount;
    
    const selectedFreq = FREQUENCIES[freqIndex];
    const investmentsPerMonth = 30 / selectedFreq.days; 
    const monthlyAmount = safeAmount * investmentsPerMonth;
    const totalInvested = monthlyAmount * duration;
    
    // Generate Chart Data
    const data = [];
    let accumulatedCoins = 0;
    
    const startPrice = CURRENT_ASSET_PRICE;
    const endPrice = projectedPrice;
    
    for (let i = 0; i <= duration; i++) {
      const progress = i / duration;
      const currentPrice = startPrice + (endPrice - startPrice) * progress;
      
      if (i > 0) {
        accumulatedCoins += monthlyAmount / currentPrice;
      }
      
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

  // 1. 连接钱包
  const connectWallet = async () => {
      if (typeof window.ethereum !== 'undefined') {
          try {
              const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
              setAccount(accounts[0]);
              return accounts[0];
          } catch (error) {
              console.error(error);
              return null;
          }
      } else {
          alert('Please install Coinbase Wallet or MetaMask');
          return null;
      }
  };

  // 2. 核心逻辑：开始定投
  const handleStartDCA = async () => {
    setIsLoading(true);
    let currentAccount = account;

    // A. 确保钱包已连接
    if (!currentAccount) {
        currentAccount = await connectWallet();
        if (!currentAccount) {
            setIsLoading(false);
            return;
        }
    }

    try {
        // --- 步骤 1: 准备数据 ---
        const provider = new ethers.BrowserProvider(window.ethereum);
        // const signer = await provider.getSigner();
        
        // 注意：真实环境中，这里需要调用 USDC 合约进行 approve
        // const usdc = new ethers.Contract(USDC_ADDRESS, ["function approve(address,uint256)"], signer);
        // await usdc.approve(YOUR_CONTRACT_ADDRESS, ethers.MaxUint256);

        // --- 步骤 2: 计算参数 ---
        const selectedFreq = FREQUENCIES[freqIndex];
        const frequencyInSeconds = selectedFreq.days * 24 * 60 * 60; // 天数转秒

        console.log("Submitting job to Supabase...");

        // --- 步骤 3: 写入 Supabase ---
        const { data, error } = await supabase
            .from('dca_jobs')
            .insert([
                {
                    user_address: currentAccount,
                    token_in: USDC_ADDRESS,
                    token_out: CBBTC_ADDRESS,
                    amount_per_trade: Number(amount),
                    frequency_seconds: frequencyInSeconds,
                    status: 'ACTIVE',
                    next_run_time: new Date().toISOString() // 立即加入队列
                }
            ])
            .select();

        if (error) {
            throw error;
        }

        alert(`🎉 Success! Your DCA plan has been created.\nUser: ${currentAccount.slice(0,6)}...`);
        // 可选：跳转到排行榜或重置表单
        // setActiveTab('leaderboard');

    } catch (err: any) {
        console.error("DCA Error:", err);
        alert("Failed to create plan: " + err.message);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    // 使用 h-[100dvh] 适应移动端实际高度
    <div className="flex flex-col h-[100dvh] bg-white text-slate-900 font-sans overflow-hidden max-w-md mx-auto shadow-2xl">
      
      {/* --- 1. Compact Header (Fixed) --- */}
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
                <div className="flex items-center gap-1 cursor-pointer" onClick={connectWallet}>
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-bold text-blue-600">Connect Wallet</span>
                </div>
            )}
          </div>
        </div>
        <div className="w-8"></div> 
      </header>

      {/* --- 2. Main Content (Auto-fill) --- */}
      <main className="flex-1 flex flex-col min-h-0 bg-white">
        
        {activeTab === 'strategy' ? (
          <>
            {/* Chart Section */}
            {/* 高度 32% */}
            <div className="flex-none h-[32%] w-full bg-slate-50 border-b border-slate-200 flex flex-col relative">
              
              {/* Header Stats */}
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
                
                {/* ROI Badge */}
                <div className={`text-right px-2 py-1 rounded-lg border ${calculation.roi >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className={`text-lg font-black leading-none ${calculation.roi >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {calculation.roi > 0 ? '+' : ''}{calculation.roi.toFixed(1)}%
                    </div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase">Proj. ROI</div>
                </div>
              </div>

              {/* Chart Container */}
              <div className="flex-1 min-h-0 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {/* right margin 35 */}
                  <AreaChart data={calculation.data} margin={{ top: 5, right: 35, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorCoins" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    
                    <XAxis 
                        dataKey="dateLabel" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        interval="preserveStartEnd"
                        minTickGap={30}
                    />
                    
                    <YAxis 
                        hide={false}
                        axisLine={false}
                        tickLine={false}
                        width={35}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}
                    />
                    
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', fontSize: '11px', color: 'white', padding: '8px' }}
                      itemStyle={{ padding: 0 }}
                      formatter={(val: any) => [`${Number(val).toFixed(4)}`, 'cbBTC']}
                      labelFormatter={(label) => `Date: ${label}`}
                      labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                    />
                    
                    <Area 
                      type="monotone" 
                      dataKey="coins" 
                      stroke="#2563EB" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorCoins)" 
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Controls Section */}
            <div className="flex-1 flex flex-col p-4 bg-white min-h-0">
              
              {/* Stats Row */}
              <div className="flex gap-3 mb-4 flex-none">
                  <StatBox label="Total Invested" value={`$${Math.round(calculation.totalInvested).toLocaleString()}`} />
                  <StatBox 
                    label="Est. Value" 
                    value={`$${Math.round(calculation.finalValue).toLocaleString()}`}
                    highlight 
                    isPositive={calculation.profit >= 0}
                  />
              </div>

              {/* Scrollable Inputs Area */}
              <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1">
                
                {/* 1. Amount Input */}
                <div>
                  <label className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Amount per Trade</span>
                    <span className="text-slate-500 font-medium">USDC</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-800 font-bold">$</span>
                    <input 
                      type="number"
                      value={amount}
                      placeholder="0"
                      onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-slate-100 border border-slate-200 text-slate-900 font-bold text-lg rounded-xl py-3 pl-7 pr-3 focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* 2. Frequency Tabs */}
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Frequency</label>
                    <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-lg">
                      {FREQUENCIES.map((freq, idx) => (
                        <button
                          key={freq.value}
                          onClick={() => setFreqIndex(idx)}
                          className={`py-2 rounded-md text-[10px] font-bold transition-all leading-tight ${
                            freqIndex === idx 
                            ? 'bg-white text-blue-700 shadow-sm border border-slate-100' 
                            : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {freq.label}
                        </button>
                      ))}
                    </div>
                </div>

                {/* 3. Sliders */}
                <div className="space-y-3 pt-1">
                  <CompactSlider 
                    label="Duration" 
                    value={duration} 
                    min={1} 
                    max={48} 
                    unit="Months"
                    onChange={setDuration} 
                  />
                  <CompactSlider 
                    label="Predict BTC" 
                    value={projectedPrice} 
                    min={CURRENT_ASSET_PRICE} 
                    max={200000} 
                    unit="$"
                    onChange={setProjectedPrice} 
                  />
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-2 mb-0 pt-2 border-t border-slate-100 flex-none text-center">
                <button 
                  className={`w-full text-white font-bold text-lg py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all ${
                      isLoading 
                      ? 'bg-slate-400 cursor-not-allowed' 
                      : 'bg-blue-600 active:bg-blue-700 active:scale-[0.98] shadow-blue-600/20'
                  }`}
                  onClick={handleStartDCA}
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : (
                      <>Start DCA <ChevronRight size={20} /></>
                  )}
                </button>
                <p className="text-[10px] text-slate-400 mt-2 px-2 font-medium">
                  This is a non-custodial protocol. We don't hold any user funds.
                </p>
              </div>

            </div>
          </>
        ) : (
          /* Leaderboard View */
          <div className="flex flex-col h-full bg-slate-50 relative">
            
            {/* Scrollable List */}
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
                <div className="mt-5">
                  <div className="flex justify-between text-[10px] font-bold uppercase mb-1 opacity-80">
                    <span>Current: 0.12</span>
                    <span>Next Tier: 1.0</span>
                  </div>
                  <div className="bg-black/20 rounded-full h-2 overflow-hidden">
                    <div className="bg-yellow-400 h-full w-[12%]"></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between px-2 pb-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Global Leaderboard</p>
                  <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded-full">Updated 1m ago</span>
              </div>
              
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

            {/* Fixed Bottom Stats for Rank Page */}
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10">
               <div className="flex justify-between items-center max-w-md mx-auto">
                 <div className="flex items-center gap-2">
                   <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                     <PiggyBank size={18} />
                   </div>
                   <div>
                     <div className="text-[10px] font-bold text-slate-500 uppercase">My Piggy Bank</div>
                     <div className="text-xs font-bold text-slate-900 leading-none mt-0.5">Total Accumulated</div>
                   </div>
                 </div>
                 <div className="text-right">
                   <div className="text-xl font-black text-blue-600 leading-none">
                     {calculation.totalCoins.toFixed(4)} <span className="text-xs text-slate-500 font-bold">cbBTC</span>
                   </div>
                 </div>
               </div>
            </div>

          </div>
        )}
      </main>

      {/* --- 3. Bottom Navigation Bar --- */}
      <nav className="flex-none bg-white border-t border-slate-200 pb-safe z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {/* 高度 h-16 */}
        <div className="flex justify-around items-center h-16">
          <button 
            onClick={() => setActiveTab('strategy')}
            className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'strategy' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <BarChart2 size={24} strokeWidth={activeTab === 'strategy' ? 3 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-wide">Strategy</span>
          </button>
          
          <div className="w-px h-8 bg-slate-100"></div>

          <button 
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'leaderboard' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Layers size={24} strokeWidth={activeTab === 'leaderboard' ? 3 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-wide">Rank</span>
          </button>
        </div>
      </nav>

    </div>
  );
}