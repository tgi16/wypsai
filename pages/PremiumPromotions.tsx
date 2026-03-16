import React, { useState, useEffect } from 'react';
import { generatePremiumPromotion } from '../geminiService';
import { PremiumPromotion } from '../types';
import Feedback from '../components/Feedback';

interface PromoHistory {
  id: string;
  date: string;
  occasion: string;
  content: PremiumPromotion;
}

const PremiumPromotions: React.FC = () => {
  const [occasion, setOccasion] = useState('Wedding Season အကြို');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PremiumPromotion | null>(null);
  const [history, setHistory] = useState<PromoHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const commonOccasions = [
    'Wedding Season အကြို',
    'Thadingyut / Tazaungdaing',
    'New Year Special',
    'Valentine\'s Day',
    'Package အသစ် မိတ်ဆက်ခြင်း'
  ];

  useEffect(() => {
    const saved = localStorage.getItem('wyp_promo_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  const saveToHistory = (content: PremiumPromotion) => {
    const newEntry: PromoHistory = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      occasion,
      content
    };
    const updatedHistory = [newEntry, ...history].slice(0, 20);
    setHistory(updatedHistory);
    localStorage.setItem('wyp_promo_history', JSON.stringify(updatedHistory));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const data = await generatePremiumPromotion(occasion);
      setResult(data);
      saveToHistory(data);
    } catch (error) {
      console.error(error);
      alert("Promotion ရေးပေးလို့ မရပါဘူး။");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setToastMsg("စာသားကို ကူးယူပြီးပါပြီ! ✨");
    setTimeout(() => setToastMsg(''), 3000);
  };

  const deleteHistoryItem = (id: string) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('wyp_promo_history', JSON.stringify(updated));
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
          <h1 className="text-3xl md:text-5xl font-black text-white">Premium <span className="text-amber-500">Promos</span></h1>
          <p className="text-slate-400 font-medium mt-1">Brand Image မကျစေမည့် Value-Added Promotion များ</p>
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
          <h2 className="text-xl font-black text-white">ယခင်ရေးခဲ့သော Promotions များ</h2>
          {history.length === 0 ? (
            <div className="text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-500">
              မှတ်တမ်း မရှိသေးပါ။
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <span className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded text-[10px] font-bold">{h.occasion}</span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-4 h-32 overflow-y-auto">
                    <p className="text-xs font-bold text-white mb-2">{h.content.title}</p>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">{h.content.caption}</p>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(h.content.caption)}
                    className="w-full py-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white rounded-xl font-bold text-xs transition-colors"
                  >
                    COPY CAPTION
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="bg-slate-900/50 border border-slate-800 p-6 md:p-8 rounded-[2rem] shadow-xl backdrop-blur-sm space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-3">မည်သည့် အချိန်အခါအတွက်လဲ?</label>
              <div className="flex flex-wrap gap-3">
                {commonOccasions.map(o => (
                  <button
                    key={o}
                    onClick={() => setOccasion(o)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      occasion === o 
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' 
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-amber-500/50 hover:text-amber-500'
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                placeholder="အခြား အကြောင်းအရာ ရိုက်ထည့်ရန်..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-5 focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm text-slate-200"
              />
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="md:w-48 py-5 bg-gradient-to-r from-amber-600 to-amber-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 rounded-2xl font-black text-slate-950 shadow-xl shadow-amber-900/20 transition-all flex items-center justify-center gap-3"
              >
                {loading ? <div className="animate-spin h-5 w-5 border-2 border-slate-950 border-t-transparent rounded-full" /> : "GENERATE 🎁"}
              </button>
            </div>
          </div>

          {loading && (
            <div className="h-64 bg-slate-900/50 rounded-[2rem] animate-pulse border border-slate-800" />
          )}

          {result && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6 md:p-8 animate-in slide-in-from-bottom-8 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800/50 relative">
                    <button 
                      onClick={() => copyToClipboard(result.caption)}
                      className="absolute top-4 right-4 px-4 py-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white rounded-xl font-bold text-xs transition-colors"
                    >
                      COPY
                    </button>
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-4">📝 Facebook Caption</span>
                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{result.caption}</p>
                  </div>
                  
                  <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800/50">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">⚖️ စည်းကမ်းချက်များ (Terms & Conditions)</span>
                    <ul className="space-y-2">
                      {result.terms.map((term, i) => (
                        <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                          <span className="text-slate-600">-</span> {term}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-2">🎁 Value-Added Offer</span>
                    <h3 className="text-lg font-black text-white mb-2">{result.title}</h3>
                    <p className="text-sm text-amber-200/80 leading-relaxed">{result.valueAdd}</p>
                  </div>

                  <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-2xl">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-2">🧠 Strategy Behind This</span>
                    <p className="text-xs text-slate-300 leading-relaxed">{result.strategy}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <Feedback contentId={`promo-${Date.now()}`} contentType="marketing" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PremiumPromotions;
