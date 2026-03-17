
import { AppTab, DailyPlan } from '../types';
import React, { useState, useEffect } from 'react';
import { generateDailyMarketingPlan } from '../geminiService';

interface DailyPlanPageProps {
  onNavigate?: (tab: AppTab) => void;
}

const DailyPlanPage: React.FC<DailyPlanPageProps> = ({ onNavigate }) => {
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = async () => {
    setLoadingPlan(true);
    setError(null);
    try {
      const plan = await generateDailyMarketingPlan();
      setDailyPlan(plan);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "အချက်အလက်များ ရယူ၍ မရနိုင်ပါ။");
    } finally {
      setLoadingPlan(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copy ကူးယူပြီးပါပြီ!");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 burmese-text">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-amber-500 font-black text-xs uppercase tracking-[0.3em] mb-2">Daily Strategy</h2>
          <h1 className="text-4xl font-black text-white tracking-tight">Daily Strategic Plan</h1>
          <p className="text-slate-400 mt-2">ဒီနေ့အတွက် Viral ဖြစ်မည့် Content လမ်းညွှန်များ</p>
        </div>
        <button 
          onClick={fetchPlan}
          disabled={loadingPlan}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-amber-500/20"
        >
          {loadingPlan ? "⌛ Generating..." : "🔄 Refresh Strategy"}
        </button>
      </header>

      <div className="relative bg-slate-900/50 border border-slate-800 rounded-[3rem] p-8 md:p-12 overflow-hidden shadow-2xl min-h-[400px]">
        {loadingPlan ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-800/50 rounded-3xl border border-slate-800" />)}
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 p-12 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
            <span className="text-5xl mb-6">⚠️</span>
            <h3 className="text-red-500 font-black text-xl mb-2">Limit Reached</h3>
            <p className="text-slate-400 text-sm max-w-md">{error}</p>
            <button 
              onClick={fetchPlan}
              className="mt-8 px-8 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-900/30 transition-all"
            >
              Try Again
            </button>
          </div>
        ) : dailyPlan ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* FACEBOOK */}
            <div className="bg-slate-950 p-8 rounded-[2rem] border border-slate-800 hover:border-blue-500/20 transition-all flex flex-col group/card shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 font-black">f</div>
                 <h3 className="font-black text-white uppercase text-sm tracking-widest">Facebook Post</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed italic mb-8 flex-1 line-clamp-4">"{dailyPlan.fbIdea}"</p>
              <button 
                onClick={() => copyText(dailyPlan.fbIdea)}
                className="w-full py-4 bg-slate-800 hover:bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Copy Caption
              </button>
            </div>

            {/* TIKTOK */}
            <div className="bg-slate-950 p-8 rounded-[2rem] border border-slate-800 hover:border-pink-500/20 transition-all flex flex-col relative overflow-hidden group/card shadow-lg">
              <div className="absolute top-4 right-4 bg-pink-500/10 text-pink-500 text-[8px] font-black px-2 py-1 rounded-md">TRENDING</div>
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 bg-pink-600/10 rounded-xl flex items-center justify-center text-pink-500 text-xl font-black">♪</div>
                 <h3 className="font-black text-white uppercase text-sm tracking-widest">TikTok Idea</h3>
              </div>
              <div className="flex-1 space-y-4 mb-8">
                <div>
                  <span className="text-[9px] text-slate-600 font-black uppercase block mb-1">Viral Hook</span>
                  <p className="text-sm text-white font-black leading-tight">{dailyPlan.tiktokHook}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-600 font-black uppercase block mb-1">Visual Idea</span>
                  <p className="text-xs text-slate-400 leading-relaxed italic">{dailyPlan.tiktokVisualIdea}</p>
                </div>
              </div>
              <button 
                onClick={() => copyText(`${dailyPlan.tiktokHook}\n\n${dailyPlan.tiktokCaption}`)}
                className="w-full py-4 bg-slate-800 hover:bg-pink-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Copy TikTok Plan
              </button>
            </div>

            {/* SALES */}
            <div className="bg-slate-950 p-8 rounded-[2rem] border border-slate-800 hover:border-amber-500/20 transition-all flex flex-col group/card shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 text-xl font-black">💬</div>
                 <h3 className="font-black text-white uppercase text-sm tracking-widest">Closing Script</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-8 flex-1 italic">"{dailyPlan.messengerTip}"</p>
              <button 
                onClick={() => onNavigate && onNavigate(AppTab.SALES_SCRIPTS)}
                className="w-full py-4 bg-slate-800 hover:bg-amber-600 text-amber-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-700 hover:border-amber-500"
              >
                View Scripts
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-12">
            <div className="text-6xl mb-6 opacity-20">📅</div>
            <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mb-8">Click refresh to generate today's plan</p>
            <button 
              onClick={fetchPlan}
              className="px-10 py-5 bg-amber-600 hover:bg-amber-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-amber-900/40 transition-all active:scale-95"
            >
              Get Daily Strategy
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyPlanPage;
