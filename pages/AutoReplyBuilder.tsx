import React, { useState, useEffect } from 'react';
import { generateAutoReply } from '../geminiService';
import { AutoReply } from '../types';
import Feedback from '../components/Feedback';

interface ReplyHistory {
  id: string;
  date: string;
  category: string;
  content: AutoReply;
}

const AutoReplyBuilder: React.FC = () => {
  const [category, setCategory] = useState('Package ဈေးနှုန်းများ');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AutoReply | null>(null);
  const [history, setHistory] = useState<ReplyHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const commonCategories = [
    'Package ဈေးနှုန်းများ',
    'Location နှင့် လမ်းညွှန်',
    'Booking တင်ရန် အဆင့်ဆင့်',
    'Softcopy နှင့် ပတ်သက်သော မေးခွန်းများ',
    'မိတ်ကပ်နှင့် အဝတ်အစား စီစဉ်ပေးမှု'
  ];

  useEffect(() => {
    const saved = localStorage.getItem('wyp_autoreply_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  const saveToHistory = (content: AutoReply) => {
    const newEntry: ReplyHistory = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      category,
      content
    };
    const updatedHistory = [newEntry, ...history].slice(0, 20);
    setHistory(updatedHistory);
    localStorage.setItem('wyp_autoreply_history', JSON.stringify(updatedHistory));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const data = await generateAutoReply(category);
      setResult(data);
      saveToHistory(data);
    } catch (error) {
      console.error(error);
      alert("Auto-Reply ရေးပေးလို့ မရပါဘူး။");
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
    localStorage.setItem('wyp_autoreply_history', JSON.stringify(updated));
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
          <h1 className="text-3xl md:text-5xl font-black text-white">Auto-Reply <span className="text-amber-500">Builder</span></h1>
          <p className="text-slate-400 font-medium mt-1">Chatbot တွင် ထည့်သွင်းရန် အသင့်သုံး FAQ စာသားများ</p>
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
          <h2 className="text-xl font-black text-white">ယခင်ရေးခဲ့သော Auto-Replies များ</h2>
          {history.length === 0 ? (
            <div className="text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-500">
              မှတ်တမ်း မရှိသေးပါ။
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
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
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-[10px] font-bold">{h.category}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {h.content.faqs.map((faq, idx) => (
                      <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <p className="text-xs font-bold text-amber-500 mb-2">Q: {faq.question}</p>
                        <p className="text-xs text-slate-300 whitespace-pre-wrap">A: {faq.answer}</p>
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
          <div className="bg-slate-900/50 border border-slate-800 p-6 md:p-8 rounded-[2rem] shadow-xl backdrop-blur-sm space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-3">မည်သည့် ကဏ္ဍအတွက်လဲ?</label>
              <div className="flex flex-wrap gap-3">
                {commonCategories.map(c => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      category === c 
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' 
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-amber-500/50 hover:text-amber-500'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="အခြား ကဏ္ဍ ရိုက်ထည့်ရန်..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-5 focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm text-slate-200"
              />
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="md:w-48 py-5 bg-gradient-to-r from-amber-600 to-amber-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 rounded-2xl font-black text-slate-950 shadow-xl shadow-amber-900/20 transition-all flex items-center justify-center gap-3"
              >
                {loading ? <div className="animate-spin h-5 w-5 border-2 border-slate-950 border-t-transparent rounded-full" /> : "GENERATE 🤖"}
              </button>
            </div>
          </div>

          {loading && (
            <div className="h-64 bg-slate-900/50 rounded-[2rem] animate-pulse border border-slate-800" />
          )}

          {result && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6 md:p-8 animate-in slide-in-from-bottom-8 duration-500">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 text-2xl">
                  🤖
                </div>
                <div>
                  <h3 className="font-black text-white text-lg">{result.category}</h3>
                  <p className="text-slate-400 text-sm font-medium">Facebook Page ၏ Automated Responses တွင် ထည့်သွင်းနိုင်ပါသည်</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {result.faqs.map((faq, index) => (
                  <div key={index} className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800/50 flex flex-col h-full">
                    <div className="mb-4">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">User Ask:</span>
                      <p className="text-sm font-bold text-white">{faq.question}</p>
                    </div>
                    <div className="flex-1 mb-4">
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-1">Bot Reply:</span>
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{faq.answer}</p>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(faq.answer)}
                      className="w-full py-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white rounded-xl font-bold text-xs transition-colors mt-auto"
                    >
                      COPY REPLY
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="mt-8">
                <Feedback contentId={`autoreply-${Date.now()}`} contentType="marketing" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AutoReplyBuilder;
