// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Wallet, TrendingUp, Calendar, DollarSign, Clock, Trophy, ChevronRight, Activity, BarChart2, Layers, PiggyBank } from 'lucide-react';

// ==========================================
//              CONSTANTS & TYPES
// ==========================================

const CURRENT_ASSET_PRICE = 64000; // 模拟 BTC 当前价格

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
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }); // e.g., "Dec 25"
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
      // 修改点4：滑块变粗 (h-2 -> h-5)，且增加圆角让手感更好
      className="w-full h-5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
    />
  </div>
);

// ==========================================
//              MAIN APP
// ==========================================

export default function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState('strategy'); // 'strategy' | 'leaderboard'
  
  // Strategy State
  // 修改点1：类型改为 number | '' 以允许删空输入框
  const [amount, setAmount] = useState<number | ''>(100);
  const [freqIndex, setFreqIndex] = useState(2); // Default Weekly (Index 2)
  const [duration, setDuration] = useState(12); // Months
  const [projectedPrice, setProjectedPrice] = useState(85000);
  
  // Calculation Results
  const calculation = useMemo(() => {
    // 修改点1：如果输入框为空，按 0 计算，防止 NaN
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
        dateLabel: getFutureDateLabel(i), // 修改点3：增加日期标签
        coins: accumulatedCoins,
        value: accumulatedCoins * currentPrice, // 资产总价值
        price: currentPrice
      });
    }

    const finalValue = accumulatedCoins * endPrice;
    const profit = finalValue - totalInvested;
    const roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

    return { data, totalInvested, finalValue, profit, roi, totalCoins: accumulatedCoins };
  }, [amount, freqIndex, duration, projectedPrice]);

  return (
    // 修改点2：使用 h-[100dvh] 适应移动端实际高度，防止地址栏遮挡
    <div className="flex flex-col h-[100dvh] bg-white text-slate-900 font-sans overflow-hidden max-w-md mx-auto shadow-2xl">
      
      {/* --- 1. Compact Header (Fixed) --- */}
      <header className="flex-none h-12 px-4 border-b border-slate-200 flex justify-between items-center bg-white z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
            <PiggyBank size={16} />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-900 leading-tight">Base piggy bank</h1>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-500">Connected</span>
            </div>
          </div>
        </div>
        <div className="w-8"></div> 
      </header>

      {/* --- 2. Main Content (Auto-fill) --- */}
      <main className="flex-1 flex flex-col min-h-0 bg-white">
        
        {activeTab === 'strategy' ? (
          <>
            {/* 修改点2：压缩图表高度 (35% -> 30%) */}
            <div className="flex-none h-[30%] w-full bg-slate-50 border-b border-slate-200 flex flex-col relative">
              
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
              <div className="flex-1 min-h-0 w-full pl-0 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={calculation.data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorCoins" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    
                    {/* 修改点3：显示 X 轴日期 */}
                    <XAxis 
                        dataKey="dateLabel" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        interval="preserveStartEnd"
                        minTickGap={30}
                    />
                    
                    {/* 修改点3：显示 Y 轴数值 (简化显示) */}
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
                      // 修改点3：Tooltip 显示对应日期
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

            {/* Controls Section - 修改点2：使用 flex-1 填充剩余空间 */}
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

              {/* Scrollable Inputs Area (if screen is very small) */}
              <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1">
                
                {/* 1. Amount Input */}
                <div>
                  <label className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Amount per Trade</span>
                    <span className="text-slate-500 font-medium">USDC</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-800 font-bold">$</span>
                    {/* 修改点1：处理空值输入 */}
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
                    label="Projected BTC" 
                    value={projectedPrice} 
                    min={CURRENT_ASSET_PRICE} 
                    max={200000} 
                    unit="$"
                    onChange={setProjectedPrice} 
                  />
                </div>
              </div>

              {/* Action Button - 修改点2：紧贴底部，确保不被遮挡 */}
              <div className="mt-3 pt-2 border-t border-slate-100 flex-none">
                <button 
                  className="w-full bg-blue-600 active:bg-blue-700 active:scale-[0.98] transition-all text-white font-bold text-lg py-3 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                  onClick={() => alert("Executing Smart Contract:\n1. Approve USDC\n2. Schedule DCA")}
                >
                  Start DCA Plan <ChevronRight size={20} />
                </button>
              </div>

            </div>
          </>
        ) : (
          /* Leaderboard View (Unchanged) */
          <div className="flex flex-col h-full bg-slate-50 relative">
             <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <Trophy size={48} className="mb-2 opacity-20" />
                <p className="font-bold">Leaderboard Coming Soon</p>
             </div>
          </div>
        )}
      </main>

      {/* --- 3. Bottom Navigation Bar --- */}
      <nav className="flex-none bg-white border-t border-slate-200 pb-safe z-30">
        <div className="flex justify-around items-center h-14">
          <button 
            onClick={() => setActiveTab('strategy')}
            className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 transition-all ${activeTab === 'strategy' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <BarChart2 size={20} strokeWidth={activeTab === 'strategy' ? 2.5 : 2} />
            <span className="text-[9px] font-bold uppercase tracking-wide">Strategy</span>
          </button>
          
          <div className="w-px h-6 bg-slate-100"></div>

          <button 
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 transition-all ${activeTab === 'leaderboard' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <Layers size={20} strokeWidth={activeTab === 'leaderboard' ? 2.5 : 2} />
            <span className="text-[9px] font-bold uppercase tracking-wide">Rank</span>
          </button>
        </div>
      </nav>

    </div>
  );
}