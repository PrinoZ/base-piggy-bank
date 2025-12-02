'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Wallet, TrendingUp, Calendar, DollarSign, Clock, Trophy, ChevronRight, Activity, BarChart2, Layers, PiggyBank } from 'lucide-react';

// ==========================================
//               CONSTANTS & TYPES
// ==========================================

const CURRENT_ASSET_PRICE = 64000; // 模拟 BTC 当前价格

const FREQUENCIES = [
  { label: 'Daily', days: 1, value: 'Daily' },
  { label: '3 Days', days: 3, value: '3 Days' },
  { label: 'Weekly', days: 7, value: 'Weekly' },
  { label: 'Bi-Weekly', days: 14, value: 'Bi-Weekly' }
];

// ==========================================
//               COMPONENTS
// ==========================================

const StatBox = ({ label, value, subValue, highlight, isPositive }: any) => (
  <div className="flex flex-col bg-white p-3 rounded-lg border border-slate-200 flex-1">
    <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider mb-1">{label}</span>
    <div className={`text-lg font-extrabold leading-none ${highlight ? (isPositive ? 'text-green-700' : 'text-slate-900') : 'text-slate-900'}`}>
      {value}
    </div>
    {subValue && <div className="text-[10px] font-bold text-slate-600 mt-1">{subValue}</div>}
  </div>
);

const CompactSlider = ({ label, value, min, max, onChange, unit }: any) => (
  <div className="w-full">
    <div className="flex justify-between items-center mb-1">
      <span className="text-xs font-bold text-slate-800">{label}</span>
      <span className="text-xs font-bold text-blue-700">{unit === '$' ? `$${value.toLocaleString()}` : `${value} ${unit}`}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
    />
  </div>
);

// ==========================================
//               MAIN APP
// ==========================================

export default function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState('strategy'); // 'strategy' | 'leaderboard'
  
  // Strategy State
  const [amount, setAmount] = useState(100);
  const [freqIndex, setFreqIndex] = useState(2); // Default Weekly (Index 2)
  const [duration, setDuration] = useState(12); // Months
  const [projectedPrice, setProjectedPrice] = useState(85000);
  
  // Calculation Results
  const calculation = useMemo(() => {
    const selectedFreq = FREQUENCIES[freqIndex];
    // Calculate total investments per month based on frequency
    const investmentsPerMonth = 30 / selectedFreq.days; 
    const monthlyAmount = amount * investmentsPerMonth;
    const totalInvested = monthlyAmount * duration;
    
    // Generate Chart Data
    const data = [];
    let accumulatedCoins = 0;
    
    // Linear price growth simulation for estimation
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
        coins: accumulatedCoins, // Y轴数据：累积币数
        price: currentPrice
      });
    }

    // 预估收益逻辑：最终持币量 * 预估价格
    const finalValue = accumulatedCoins * endPrice;
    const profit = finalValue - totalInvested;
    const roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

    return { data, totalInvested, finalValue, profit, roi, totalCoins: accumulatedCoins };
  }, [amount, freqIndex, duration, projectedPrice]);

  return (
    <div className="flex flex-col h-screen bg-white text-slate-900 font-sans overflow-hidden max-w-md mx-auto shadow-2xl">
      
      {/* --- 1. Compact Header (Fixed) --- */}
      <header className="flex-none h-14 px-4 border-b border-slate-200 flex justify-between items-center bg-white z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
            <PiggyBank size={18} />
          </div>
          <div>
            {/* Update 1: App Name Changed */}
            <h1 className="text-sm font-extrabold text-slate-900 leading-tight">Base piggy bank</h1>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-600">Connected</span>
            </div>
          </div>
        </div>
        <div className="w-8"></div> 
      </header>

      {/* --- 2. Main Content (Scrollable) --- */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-white pb-safe">
        
        {activeTab === 'strategy' ? (
          <>
            {/* Chart Section - Redesigned Layout */}
            <div className="flex-none h-[35%] w-full bg-slate-50 border-b border-slate-200 flex flex-col">
              
              {/* Header & Progress Bar Area */}
              <div className="px-5 pt-6 pb-2 flex-none">
                
                {/* Row 1: Number + Unit */}
                <div className="flex items-baseline gap-2 mb-2">
                    <div className="text-4xl font-black text-slate-900 tracking-tighter leading-none">
                       {calculation.totalCoins.toFixed(4)}
                    </div>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">CBBTC</span>
                </div>

                {/* Row 2: Progress Bar */}
                <div className="w-2/3">
                   <div className="flex justify-between items-end mb-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Plan Progress</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">0%</span>
                   </div>
                   <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-blue-600 w-[2%] rounded-full"></div> 
                   </div>
                </div>

              </div>

              {/* Chart Container - Fills remaining space */}
              <div className="flex-1 min-h-0 relative w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={calculation.data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCoins" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="month" hide />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', fontSize: '12px', color: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)' }}
                      itemStyle={{ color: '#60A5FA', fontWeight: 'bold' }}
                      labelStyle={{ display: 'none' }}
                      formatter={(val) => [`${val.toFixed(4)}`, 'cbBTC']}
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
                
                {/* Overlay Stats: Focus on ROI % */}
                <div className="absolute bottom-3 right-4 text-right bg-white/50 backdrop-blur-sm p-1 rounded-lg border border-slate-200/50">
                  <div className="text-[10px] text-slate-600 font-bold uppercase">Proj. ROI</div>
                  <div className={`text-2xl font-black tracking-tight ${calculation.roi >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {calculation.roi > 0 ? '+' : ''}{calculation.roi.toFixed(1)}%
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">
                    @ ${projectedPrice.toLocaleString()} / BTC
                  </div>
                </div>
              </div>
            </div>

            {/* Controls & Inputs Section */}
            <div className="flex-1 p-4 flex flex-col gap-4">
              
              {/* Top Row Stats */}
              <div className="flex gap-3">
                 <StatBox label="Total Invested" value={`$${Math.round(calculation.totalInvested).toLocaleString()}`} />
                 <StatBox 
                    label="Accumulated" 
                    value={
                        <div className="flex items-baseline gap-1">
                            <span>{calculation.totalCoins.toFixed(4)}</span>
                            <span className="text-xs font-bold text-slate-500">cbBTC</span>
                        </div>
                    } 
                    highlight 
                 />
              </div>

              {/* Inputs Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-5">
                
                {/* 1. Amount Input */}
                <div>
                  <label className="flex justify-between text-xs font-bold text-slate-700 mb-2">
                    <span>Amount per Trade</span>
                    <span className="text-slate-500 font-medium">USDC</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-800 font-bold">$</span>
                    <input 
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full bg-slate-100 border border-slate-200 text-slate-900 font-bold text-lg rounded-xl py-3 pl-7 pr-3 focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>
                </div>

                {/* 2. Frequency Tabs */}
                <div>
                   <label className="block text-xs font-bold text-slate-700 mb-2">Frequency</label>
                   <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-lg">
                      {FREQUENCIES.map((freq, idx) => (
                        <button
                          key={freq.value}
                          onClick={() => setFreqIndex(idx)}
                          className={`py-2 px-1 rounded-md text-[10px] font-bold transition-all leading-tight ${
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

                {/* 3. Sliders Group */}
                <div className="space-y-6 pt-1">
                  <CompactSlider 
                    label="Duration" 
                    value={duration} 
                    min={1} 
                    max={48} 
                    unit="Months"
                    onChange={setDuration} 
                  />
                  <CompactSlider 
                    label="Projected BTC Price" 
                    value={projectedPrice} 
                    min={CURRENT_ASSET_PRICE} 
                    max={200000} 
                    unit="$"
                    onChange={setProjectedPrice} 
                  />
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 mb-4 text-center">
                <button 
                  className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                  onClick={() => alert("Executing Smart Contract:\n1. Approve USDC\n2. Schedule DCA")}
                >
                  Start DCA Plan <ChevronRight size={20} />
                </button>
                <p className="text-[10px] text-slate-400 mt-3 px-2 font-medium">
                  This is a non-custodial protocol. We do not hold any user funds.
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

            {/* Update 2: Fixed Bottom Stats for Rank Page */}
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