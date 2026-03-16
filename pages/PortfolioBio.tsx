
import React, { useState } from 'react';
import { generatePortfolioBio } from '../geminiService';
import Feedback from '../components/Feedback';

const PortfolioBio: React.FC = () => {
  const [style, setStyle] = useState('Professional');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ bio: string, tips: string } | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const data = await generatePortfolioBio(style, details);
      setResult(data);
    } catch (error) {
      console.error(error);
      alert("Bio ထုတ်ပေးလို့ မရပါဘူး။");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 burmese-text pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-white">Portfolio <span className="text-indigo-500">Bio</span></h1>
          <p className="text-slate-400 font-medium mt-1">သင့်ရဲ့ Studio ကို Professional ဆန်ဆန် မိတ်ဆက်ပါ။</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* INPUT */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 p-6 md:p-8 rounded-[2rem] shadow-xl backdrop-blur-sm">
            <div className="mb-6">
              <label className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] block mb-3">Writing Style</label>
              <select 
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Professional">Professional (ရိုးရှင်းပြီး လေးနက်သော)</option>
                <option value="Friendly">Friendly (ရင်းနှီးဖော်ရွေသော)</option>
                <option value="Luxury">Luxury (အဆင့်မြင့်ပြီး ခမ်းနားသော)</option>
                <option value="Creative">Creative (ဆန်းသစ်သော)</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] block mb-3">Extra Details (ထပ်ထည့်ချင်သည့်အချက်များ)</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="ဥပမာ- '၁၀ နှစ်ကျော် အတွေ့အကြုံရှိသည်'၊ 'တောင်ကြီးမြို့အနှံ့ ရိုက်ကူးပေးသည်'..."
                className="w-full h-32 bg-slate-950 border border-slate-800 rounded-2xl p-5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm leading-relaxed text-slate-200 resize-none"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-xl font-black text-xs transition-all shadow-lg shadow-indigo-900/20"
            >
              {loading ? "WRITING BIO..." : "GENERATE BIO ✨"}
            </button>
          </div>
        </div>

        {/* RESULTS */}
        <div className="lg:col-span-7">
          {!result && !loading && (
            <div className="h-[400px] border-2 border-dashed border-slate-900 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-10">
              <div className="text-6xl mb-6 opacity-10">👤</div>
              <p className="text-slate-600 font-bold uppercase text-xs tracking-widest">Select a style to generate your bio</p>
            </div>
          )}

          {loading && (
            <div className="space-y-6">
              <div className="h-64 bg-slate-900/50 rounded-[2rem] animate-pulse border border-slate-800" />
              <div className="h-40 bg-slate-900/50 rounded-[2rem] animate-pulse border border-slate-800" />
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 text-9xl text-indigo-500/5 pointer-events-none">👤</div>
                
                <h4 className="text-indigo-500 font-black uppercase tracking-widest text-[10px] mb-6">Generated Bio Content</h4>
                
                <div className="bg-slate-950/80 p-8 rounded-3xl text-slate-200 text-sm md:text-base leading-relaxed border border-slate-800 mb-8 whitespace-pre-wrap font-medium shadow-inner">
                  {result.bio}
                </div>

                <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-2xl mb-8">
                  <h5 className="text-amber-500 font-black text-[10px] uppercase mb-2 flex items-center gap-2">
                    <span>💡</span> Optimization Tips
                  </h5>
                  <p className="text-xs text-slate-400 leading-relaxed italic">{result.tips}</p>
                </div>

                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(result.bio);
                    alert("Bio ကို Copy ကူးပြီးပါပြီ!");
                  }}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-xs transition-all border border-slate-700 shadow-lg"
                >
                  📋 COPY BIO TO CLIPBOARD
                </button>

                <Feedback 
                  contentId={`bio-${Date.now()}`} 
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

export default PortfolioBio;
