
import React from 'react';
import { AppTab } from '../types';
import { MENU_GROUPS } from '../constants';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
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
      
      <div className="p-6 border-t border-slate-900/50 shrink-0">
        <a 
          href="https://www.facebook.com/wypstudio" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 bg-blue-600/5 hover:bg-blue-600/10 text-blue-400 rounded-2xl transition-all border border-blue-500/10 group"
        >
          <span className="text-xl group-hover:rotate-12 transition-transform">🔵</span>
          <span className="text-xs font-black uppercase tracking-[0.2em]">Facebook</span>
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
