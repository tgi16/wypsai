
import { AppTab } from '../types';
import React from 'react';
import StrategyPartner from './StrategyPartner';

interface DashboardProps {
  onNavigate: (tab: AppTab) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-amber-500 font-black text-xs uppercase tracking-[0.3em] mb-2">Main Dashboard</h2>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">Strategy <span className="text-slate-500">Partner.</span></h1>
        </div>
        <div className="flex items-center gap-4 bg-slate-900/50 border border-slate-800 p-2 rounded-2xl backdrop-blur-md">
           <div className="bg-amber-500/10 text-amber-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
             AI Consultant Active
           </div>
        </div>
      </header>

      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-600 to-amber-400 rounded-[3rem] blur opacity-10"></div>
        <div className="relative">
          <StrategyPartner />
        </div>
      </div>

      {/* Quick Stats Footer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12">
        <div className="bg-slate-900/30 p-8 rounded-[2.5rem] border border-slate-800 flex items-center gap-6">
           <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center text-3xl">📊</div>
           <div>
             <h4 className="text-white font-black uppercase text-xs tracking-widest mb-1">Market Position</h4>
             <p className="text-slate-400 text-xs burmese-text">တောင်ကြီးမြို့ရှိ Premium Indoor Studio များထဲတွင် Top Tier အဖြစ် သတ်မှတ်ခံရသည်။</p>
           </div>
        </div>
        <div className="bg-slate-900/30 p-8 rounded-[2.5rem] border border-slate-800 flex items-center justify-between">
           <div>
             <h4 className="text-white font-black uppercase text-xs tracking-widest mb-1">Brand Health</h4>
             <div className="flex gap-1 mt-2">
                {[1,2,3,4,5].map(i => <div key={i} className="w-4 h-1 bg-amber-500 rounded-full"></div>)}
             </div>
           </div>
           <button 
             onClick={() => onNavigate(AppTab.STRATEGY)} 
             className="text-amber-500 text-[10px] font-black uppercase tracking-widest hover:underline"
           >
             Daily Plan →
           </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
