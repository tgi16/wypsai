import React, { useState, useEffect } from 'react';
import { generateEngagementPost } from '../geminiService';
import { EngagementPost } from '../types';
import Feedback from '../components/Feedback';

interface EngagementHistory {
  id: string;
  date: string;
  topic: string;
  type: string;
  content: EngagementPost;
}

const EngagementPosts: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [postType, setPostType] = useState('Giveaway / Contest');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EngagementPost | null>(null);
  const [history, setHistory] = useState<EngagementHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const postTypes = [
    'Giveaway / Contest',
    'This or That (A or B)',
    'Tag a Friend',
    'Q&A / Ask Audience',
    'Fill in the Blank'
  ];

  useEffect(() => {
    const saved = localStorage.getItem('wyp_engagement_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  const saveToHistory = (content: EngagementPost) => {
    const newEntry: EngagementHistory = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      topic,
      type: postType,
      content
    };
    const updatedHistory = [newEntry, ...history].slice(0, 20); // Keep last 20
    setHistory(updatedHistory);
    localStorage.setItem('wyp_engagement_history', JSON.stringify(updatedHistory));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const data = await generateEngagementPost(topic, postType);
      setResult(data);
      saveToHistory(data);
    } catch (error) {
      console.error(error);
      alert("ပိုစ့်ရေးပေးလို့ မရပါဘူး။");
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
    localStorage.setItem('wyp_engagement_history', JSON.stringify(updated));
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
          <h1 className="text-3xl md:text-5xl font-black text-white">Engagement <span className="text-amber-500">Boost</span></h1>
          <p className="text-slate-400 font-medium mt-1">Reach ကျနေသော Page ကို ပြန်ဆယ်ရန်</p>
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
          <h2 className="text-xl font-black text-white">ယခင်ရေးခဲ့သော ပိုစ့်များ</h2>
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
                  <div className="flex gap-2 mb-4">
                    <span className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded text-[10px] font-bold">{h.type}</span>
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-[10px] font-bold">{h.topic || 'General'}</span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-4 h-32 overflow-y-auto">
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
              <label className="block text-sm font-bold text-slate-300 mb-3">ပိုစ့်အမျိုးအစား ရွေးချယ်ပါ</label>
              <div className="flex flex-wrap gap-3">
                {postTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setPostType(type)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      postType === type 
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' 
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-amber-500/50 hover:text-amber-500'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="ဘာအကြောင်း အဓိကထားချင်လဲ? (ဥပမာ - Pre-wedding အမှတ်တရ၊ မိတ်ကပ်)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-5 focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm text-slate-200"
              />
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="md:w-48 py-5 bg-gradient-to-r from-amber-600 to-amber-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 rounded-2xl font-black text-slate-950 shadow-xl shadow-amber-900/20 transition-all flex items-center justify-center gap-3"
              >
                {loading ? <div className="animate-spin h-5 w-5 border-2 border-slate-950 border-t-transparent rounded-full" /> : "GENERATE 🚀"}
              </button>
            </div>
          </div>

          {loading && (
            <div className="h-64 bg-slate-900/50 rounded-[2rem] animate-pulse border border-slate-800" />
          )}

          {result && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6 md:p-8 animate-in slide-in-from-bottom-8 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 text-2xl">
                  🔥
                </div>
                <div>
                  <h3 className="font-black text-white text-lg">{result.type}</h3>
                  <p className="text-amber-500 text-sm font-bold">{result.hook}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800/50 relative">
                    <button 
                      onClick={() => copyToClipboard(result.caption)}
                      className="absolute top-4 right-4 px-4 py-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white rounded-xl font-bold text-xs transition-colors"
                    >
                      COPY
                    </button>
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-4">📝 Caption</span>
                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{result.caption}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-2xl h-full">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-4">📸 Visual Idea</span>
                    <p className="text-sm text-slate-300 leading-relaxed">{result.visualIdea}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <Feedback contentId={`engagement-${Date.now()}`} contentType="marketing" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EngagementPosts;
