
import React, { useState, useEffect } from 'react';
import { AppTab } from '../types';
import { APP_VERSION, DAILY_BUDGET, MENU_GROUPS } from '../constants';
import { useFirebase } from './FirebaseContext';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}

interface UsageData {
  totalCost: number;
  count: number;
  lastCost?: number;
}

const normalizeUsage = (raw: any): UsageData => ({
  totalCost: Number(raw?.totalCost) || 0,
  count: Number(raw?.count) || 0,
  lastCost: Number(raw?.lastCost) || 0,
});

const getUsageDayKey = () => new Date().toLocaleDateString('en-CA');

const navItemClass = (isActive: boolean) =>
  [
    'group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200',
    isActive
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.08)]'
      : 'border-transparent text-slate-500 hover:border-slate-700/60 hover:bg-slate-900/50 hover:text-slate-300',
  ].join(' ');

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, login, logout } = useFirebase();
  const [usage, setUsage] = useState<UsageData>({ totalCost: 0, count: 0 });

  const loadUsage = () => {
    const today = getUsageDayKey();
    const savedUsage = JSON.parse(localStorage.getItem('gemini_usage_v2') || '{}');
    if (savedUsage[today]) {
      setUsage(normalizeUsage(savedUsage[today]));
    }
  };

  useEffect(() => {
    loadUsage();
    const handleUpdate = (event: any) => {
      setUsage(normalizeUsage(event.detail));
    };
    window.addEventListener('gemini_usage_updated', handleUpdate);
    return () => window.removeEventListener('gemini_usage_updated', handleUpdate);
  }, []);

  const budget = DAILY_BUDGET;
  const percentage = Math.min((usage.totalCost / budget) * 100, 100);
  const progressWidth = usage.totalCost > 0 ? Math.max(percentage, 1) : 0;

  return (
    <aside className="h-[100dvh] max-h-[100dvh] w-72 shrink-0 overflow-y-auto border-r border-slate-800/50 bg-slate-950/50 backdrop-blur-md custom-scrollbar">
      <div className="p-10 text-left shrink-0">
        <h1 className="text-2xl font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent tracking-tighter leading-tight">
          WITH YOU<br/>STUDIO
        </h1>
        <div className="h-1 w-12 bg-amber-500 mt-2 rounded-full"></div>
        <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-slate-600">WYPSAI v{APP_VERSION}</p>
      </div>
      
      <nav className="space-y-6 px-4 pb-4">
        {MENU_GROUPS.map((group, index) => (
          <div key={index}>
            {group.title !== 'Main' && (
              <h3 className="px-4 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                {group.title}
              </h3>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={navItemClass(isActive)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span
                      className={`text-xl shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? 'opacity-100' : 'opacity-40'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold tracking-wide burmese-text">{item.label}</span>
                      {item.subtitle && (
                        <span className="block text-[11px] text-slate-500 mt-0.5 burmese-text">{item.subtitle}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      
      <div className="space-y-4 border-t border-slate-900/50 p-6">
        {/* Auth Section */}
        {!user ? (
          <button 
            onClick={() => login()}
            className="w-full flex items-center justify-center gap-3 p-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-2xl transition-all border border-amber-500/20 font-bold text-sm"
          >
            <span>🔑</span> Google ဖြင့် Login ဝင်ရန်
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-2">
              <img src={user.photoURL || ''} alt="User" className="w-8 h-8 rounded-full border border-amber-500/30" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
                <button onClick={() => logout()} className="text-[10px] text-slate-500 hover:text-amber-500 transition-colors">Logout</button>
              </div>
            </div>
          </div>
        )}

        {/* Usage Tracker in Sidebar */}
        <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">API Usage</span>
            <span className="text-[9px] font-black text-amber-500">${usage.totalCost.toFixed(4)} / ${budget.toFixed(2)}</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
            <div 
              className={`h-full transition-all duration-1000 ${percentage > 80 ? 'bg-red-500' : percentage > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${progressWidth}%` }}
            />
          </div>
          <div className="flex justify-between text-[8px] font-bold text-slate-600">
            <span>{usage.count} calls today</span>
            <span>{percentage.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
