
import React, { useState } from 'react';
import { generateHashtags } from '../geminiService';
import Feedback from '../components/Feedback';

const HashtagStrategy: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ tags: string[], strategy: string } | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await generateHashtags(topic);
      setResult(data);
    } catch (error) {
      console.error(error);
      alert("Hashtags ထုတ်ပေးလို့ မရပါဘူး။");
    } finally {
      setLoading(false);
    }
  };

  const copyTags = () => {
    if (!result) return;
    const tagsText = result.tags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ');
    navigator.clipboard.writeText(tagsText);
    setToastMsg("Hashtags အားလုံးကို Copy ကူးပြီးပါပြီ!");
    setTimeout(() => setToastMsg(''), 3000);
  };

  return (
    <div className="space-y-8 burmese-text pb-10">
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-emerald-500 text-slate-950 px-6 py-3 rounded-full shadow-2xl font-black text-sm animate-in fade-in slide-in-from-top-4">
          ✨ {toastMsg}
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-white">Hashtag <span className="text-emerald-500">Strategy</span></h1>
          <p className="text-slate-400 font-medium mt-1">Social Media ပေါ်မှာ လူသိများစေမည့် Hashtag များ ရှာဖွေပါ။</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* INPUT */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 p-6 md:p-8 rounded-[2rem] shadow-xl backdrop-blur-sm">
            <label className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] block mb-4">Content Topic / Niche (အကြောင်းအရာ)</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="ဥပမာ- 'တောင်ကြီးမြို့က မင်္ဂလာဆောင်ဓာတ်ပုံများ' သို့မဟုတ် 'Outdoor Pre-wedding'..."
              className="w-full h-32 bg-slate-950 border border-slate-800 rounded-2xl p-5 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm leading-relaxed text-slate-200 resize-none mb-4"
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white rounded-xl font-black text-xs transition-all shadow-lg shadow-emerald-900/20"
            >
              {loading ? "FINDING TAGS..." : "GENERATE HASHTAGS ✨"}
            </button>
          </div>

          <div className="bg-slate-900/30 border border-slate-800/50 p-6 rounded-2xl">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Pro Tips</h4>
            <ul className="space-y-3 text-xs text-slate-400 leading-relaxed">
              <li className="flex gap-2"><span>✅</span> Facebook မှာ Hashtag ၂-၃ ခုထက် ပိုမသုံးပါနဲ့။</li>
              <li className="flex gap-2"><span>✅</span> TikTok မှာ Trending ဖြစ်နေတဲ့ Music နဲ့ တွဲသုံးပါ။</li>
              <li className="flex gap-2"><span>✅</span> ကိုယ်ပိုင် Brand Hashtag (ဥပမာ- #WithYouStudio) အမြဲထည့်ပါ။</li>
            </ul>
          </div>
        </div>

        {/* RESULTS */}
        <div className="lg:col-span-7">
          {!result && !loading && (
            <div className="h-[400px] border-2 border-dashed border-slate-900 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-10">
              <div className="text-6xl mb-6 opacity-10">#️⃣</div>
              <p className="text-slate-600 font-bold uppercase text-xs tracking-widest">Enter a topic to see the strategy</p>
            </div>
          )}

          {loading && (
            <div className="space-y-6">
              <div className="h-40 bg-slate-900/50 rounded-[2rem] animate-pulse border border-slate-800" />
              <div className="h-64 bg-slate-900/50 rounded-[2rem] animate-pulse border border-slate-800" />
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 text-9xl text-emerald-500/5 pointer-events-none">#️⃣</div>
                
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-emerald-500 font-black uppercase tracking-widest text-[10px]">Optimized Hashtags</h4>
                  <button 
                    onClick={copyTags}
                    className="text-[10px] font-black text-slate-400 hover:text-white transition-colors"
                  >
                    COPY ALL
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-8">
                  {result.tags.map((tag, i) => (
                    <span key={i} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-bold">
                      {tag.startsWith('#') ? tag : `#${tag}`}
                    </span>
                  ))}
                </div>

                <div className="space-y-4">
                  <h4 className="text-slate-300 font-black uppercase tracking-widest text-[10px]">Viral Strategy</h4>
                  <div className="bg-slate-950/80 p-6 rounded-2xl text-slate-300 text-sm leading-relaxed border border-slate-800 whitespace-pre-wrap font-medium">
                    {result.strategy}
                  </div>
                </div>

                <Feedback 
                  contentId={`hashtags-${Date.now()}`} 
                  contentType="marketing" 
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HashtagStrategy;
