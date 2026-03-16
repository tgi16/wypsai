import React, { useState, useEffect } from 'react';
import { generateSevenDayPlan } from '../geminiService';
import { DailyContent } from '../types';
import Feedback from '../components/Feedback';

interface PlanHistory {
  id: string;
  date: string;
  focusArea: string;
  plan: DailyContent[];
}

const SevenDayPlan: React.FC = () => {
  const [focusArea, setFocusArea] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<DailyContent[]>([]);
  const [toastMsg, setToastMsg] = useState('');
  const [history, setHistory] = useState<PlanHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const savedHistory = localStorage.getItem('wyp_7day_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  const saveToHistory = (newPlan: DailyContent[]) => {
    const newEntry: PlanHistory = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      focusArea,
      plan: newPlan
    };
    const updatedHistory = [newEntry, ...history].slice(0, 10);
    setHistory(updatedHistory);
    localStorage.setItem('wyp_7day_history', JSON.stringify(updatedHistory));
  };

  const deleteHistoryItem = (id: string) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('wyp_7day_history', JSON.stringify(updated));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setPlan([]);
    try {
      const data = await generateSevenDayPlan(focusArea);
      setPlan(data);
      saveToHistory(data);
    } catch (error) {
      console.error(error);
      alert("၇ ရက်စာ Plan ထုတ်ပေးလို့ မရပါဘူး။");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setToastMsg("စာသားကို ကူးယူပြီးပါပြီ! ✨");
    setTimeout(() => setToastMsg(''), 3000);
  };

  return (
    <div className="space-y-6 md:space-y-10 burmese-text pb-10">
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-amber-500 text-slate-950 px-6 py-3 rounded-full shadow-2xl font-black text-sm animate-in fade-in slide-in-from-top-4">
          {toastMsg}
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-white">7-Day <span className="text-amber-500">Plan</span></h1>
          <p className="text-slate-400 font-medium mt-1">Indoor ပုံများကိုသာ အသုံးပြု၍ တစ်ပတ်စာ Content ရေးဆွဲရန်</p>
        </div>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-sm transition-colors border border-slate-700"
        >
          {showHistory ? '🔙 အသစ်ရေးမည်' : '📜 History ကြည့်မည်'}
        </button>
      </header>

      {showHistory ? (
        <div className="space-y-6 animate-in fade-in">
          <h2 className="text-xl font-black text-white">ယခင်ရေးခဲ့သော Plan များ</h2>
          {history.length === 0 ? (
            <div className="text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-500">
              မှတ်တမ်း မရှိသေးပါ။
            </div>
          ) : (
            <div className="space-y-6">
              {history.map((h) => (
                <div key={h.id} className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2rem] relative group">
                  <button 
                    onClick={() => deleteHistoryItem(h.id)}
                    className="absolute top-4 right-4 w-8 h-8 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                  >
                    ✕
                  </button>
                  <div className="text-[10px] text-slate-500 mb-2">{h.date}</div>
                  <div className="mb-4">
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-bold">Focus: {h.focusArea || 'General Indoor'}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {h.plan.map((dayPlan, idx) => (
                      <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col">
                        <div className="text-amber-500 font-black text-[10px] uppercase tracking-widest mb-1">{dayPlan.day}</div>
                        <div className="text-white text-xs font-bold mb-2">{dayPlan.theme}</div>
                        <p className="text-[10px] text-slate-400 line-clamp-3 mb-2 flex-1">{dayPlan.caption}</p>
                        <button 
                          onClick={() => copyToClipboard(dayPlan.caption)}
                          className="w-full py-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white rounded-lg font-bold text-[10px] transition-colors mt-auto"
                        >
                          COPY
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="bg-slate-900/50 border border-slate-800 p-6 md:p-8 rounded-[2rem] shadow-xl backdrop-blur-sm">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
                placeholder="ဒီတစ်ပတ် ဘာအကြောင်း အဓိက တင်ချင်လဲ? (ဥပမာ - မိတ်ကပ်အလှ၊ Storytelling)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-5 focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm text-slate-200"
              />
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="md:w-48 py-5 bg-gradient-to-r from-amber-600 to-amber-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 rounded-2xl font-black text-slate-950 shadow-xl shadow-amber-900/20 transition-all flex items-center justify-center gap-3"
              >
                {loading ? <div className="animate-spin h-5 w-5 border-2 border-slate-950 border-t-transparent rounded-full" /> : "GENERATE PLAN 📅"}
              </button>
            </div>
            <p className="text-[10px] text-amber-500/80 mt-4 font-medium">
              💡 မှတ်ချက်: Studio တွင် Indoor ပုံများသာ အများဆုံးရှိသဖြင့် AI မှ Indoor ပုံများကိုသာ အခြေခံ၍ (ဥပမာ - အဖြူအမည်းပြောင်းခြင်း၊ စာသားထည့်ခြင်း၊ အနီးကပ်ဖြတ်တင်ခြင်း) အကြံပြုပေးပါမည်။
            </p>
          </div>

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="h-64 bg-slate-900/50 rounded-[2rem] animate-pulse border border-slate-800" />
              ))}
            </div>
          )}

          {plan.length > 0 && (
            <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plan.map((dayPlan, index) => (
                  <div key={index} className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6 relative overflow-hidden group flex flex-col h-full">
                    <div className="absolute -top-6 -right-6 text-8xl text-slate-800/20 font-black group-hover:scale-110 transition-transform">
                      {index + 1}
                    </div>
                    
                    <div className="relative z-10 flex-1 flex flex-col">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 font-black text-xs uppercase tracking-widest">
                          {dayPlan.day}
                        </div>
                        <h3 className="font-black text-white text-sm uppercase tracking-tight">{dayPlan.theme}</h3>
                      </div>
                      
                      <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-2xl mb-4">
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-2">📸 Visual Idea (Indoor ပုံ)</span>
                        <p className="text-xs text-slate-300 leading-relaxed">{dayPlan.visualIdea}</p>
                      </div>
                      
                      <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/50 flex-1 mb-4">
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block mb-2">✍️ Caption</span>
                        <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{dayPlan.caption}</p>
                      </div>

                      <button 
                        onClick={() => copyToClipboard(dayPlan.caption)}
                        className="w-full py-3 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white rounded-xl font-black text-[10px] transition-all border border-slate-700 hover:border-amber-500 mt-auto"
                      >
                        COPY CAPTION
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <Feedback 
                contentId={`7dayplan-${Date.now()}`} 
                contentType="marketing" 
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SevenDayPlan;
