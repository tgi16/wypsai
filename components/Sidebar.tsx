
import React, { useState, useEffect } from 'react';
import { AppTab } from '../types';
import { MENU_GROUPS } from '../constants';
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

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, login, logout } = useFirebase();
  const [usage, setUsage] = useState<UsageData>({ totalCost: 0, count: 0 });

  const loadUsage = () => {
    const today = new Date().toISOString().split('T')[0];
    const savedUsage = JSON.parse(localStorage.getItem('gemini_usage_v2') || '{}');
    if (savedUsage[today]) {
      setUsage(savedUsage[today]);
    }
  };

  useEffect(() => {
    loadUsage();
    const handleUpdate = (event: any) => {
      setUsage(event.detail);
    };
    window.addEventListener('gemini_usage_updated', handleUpdate);
    return () => window.removeEventListener('gemini_usage_updated', handleUpdate);
  }, []);

  const budget = 5.0;
  const percentage = Math.min((usage.totalCost / budget) * 100, 100);

  return (
    <aside className="w-72 bg-slate-950/50 h-screen border-r border-slate-800/50 flex flex-col sticky top-0 backdrop-blur-md">
      <div className="p-10 text-left shrink-0">
        <h1 className="text-2xl font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent tracking-tighter leading-tight">
          WITH YOU<br/>STUDIO
        </h1>
        <div className="h-1 w-12 bg-amber-500 mt-2 rounded-full"></div>
      </div>
      
      <nav className="flex-1 px-4 space-y-6 overflow-y-auto pb-8 custom-scrollbar">
        {MENU_GROUPS.map((group, index) => (
          <div key={index}>
            {group.title !== 'Main' && (
              <h3 className="px-4 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                {group.title}
              </h3>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center p-3 rounded-2xl transition-all duration-300 group ${
                    activeTab === item.id
                      ? 'bg-amber-600/10 text-amber-500 border border-amber-500/20'
                      : 'text-slate-500 hover:bg-slate-900/50 hover:text-slate-300 border border-transparent'
                  }`}
                >
                  <span className={`text-xl mr-4 transition-transform group-hover:scale-110 ${activeTab === item.id ? 'opacity-100' : 'opacity-40'}`}>{item.icon}</span>
                  <span className="font-bold text-sm burmese-text tracking-wide">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
      
      <div className="p-6 border-t border-slate-900/50 shrink-0 space-y-4">
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
            <span className="text-[9px] font-black text-amber-500">${usage.totalCost.toFixed(3)} / $5</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
            <div 
              className={`h-full transition-all duration-1000 ${percentage > 80 ? 'bg-red-500' : percentage > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-[8px] font-bold text-slate-600">
            <span>{usage.count} calls today</span>
            {usage.lastCost && <span>Last: ${usage.lastCost.toFixed(4)}</span>}
          </div>
        </div>

        <a 
          href="https://wypstudio-pos.web.app/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 bg-amber-600/5 hover:bg-amber-600/10 text-amber-500 rounded-2xl transition-all border border-amber-500/10 group"
        >
          <span className="text-xl group-hover:rotate-12 transition-transform">🏪</span>
          <span className="text-xs font-black uppercase tracking-[0.2em]">POS System</span>
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
