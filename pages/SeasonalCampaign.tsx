
import React, { useState } from 'react';
import { generateSeasonalCampaign } from '../geminiService';
import Feedback from '../components/Feedback';

const SeasonalCampaign: React.FC = () => {
  const [season, setSeason] = useState('သင်္ကြန်ပွဲတော်');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ title: string, ideas: string[], promotion: string } | null>(null);

  const seasons = [
    "သင်္ကြန်ပွဲတော်",
    "သီတင်းကျွတ်ပွဲတော်",
    "တန်ဆောင်တိုင်ပွဲတော်",
    "Valentine's Day",
    "ကျောင်းဖွင့်ရာသီ",
    "မိုးရာသီ (Rainy Season)"
  ];

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const data = await generateSeasonalCampaign(season);
      setResult(data);
    } catch (error) {
      console.error(error);
      alert("Campaign ထုတ်ပေးလို့ မရပါဘူး။");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 burmese-text pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-white">Seasonal <span className="text-pink-500">Campaign</span></h1>
          <p className="text-slate-400 font-medium mt-1">ပွဲတော်ရက်များအတွက် အထူး Marketing အစီအစဉ်များ။</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* INPUT */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 p-6 md:p-8 rounded-[2rem] shadow-xl backdrop-blur-sm">
            <div className="mb-6">
              <label className="text-[10px] font-black text-pink-500 uppercase tracking-[0.2em] block mb-3">Select Season</label>
              <div className="grid grid-cols-1 gap-2">
                {seasons.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setSeason(s)}
                    className={`w-full text-left p-4 rounded-xl border transition-all text-sm font-bold ${
                      season === s 
                        ? 'bg-pink-600/10 border-pink-500 text-pink-500' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-4 bg-pink-600 hover:bg-pink-500 disabled:opacity-30 text-white rounded-xl font-black text-xs transition-all shadow-lg shadow-pink-900/20"
            >
              {loading ? "PLANNING..." : "GENERATE CAMPAIGN ✨"}
            </button>
          </div>
        </div>

        {/* RESULTS */}
        <div className="lg:col-span-7">
          {!result && !loading && (
            <div className="h-[400px] border-2 border-dashed border-slate-900 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-10">
              <div className="text-6xl mb-6 opacity-10">🎉</div>
              <p className="text-slate-600 font-bold uppercase text-xs tracking-widest">Pick a season to start planning</p>
            </div>
          )}

          {loading && (
            <div className="space-y-6">
              <div className="h-20 bg-slate-900/50 rounded-[2rem] animate-pulse border border-slate-800" />
              <div className="h-64 bg-slate-900/50 rounded-[2rem] animate-pulse border border-slate-800" />
              <div className="h-32 bg-slate-900/50 rounded-[2rem] animate-pulse border border-slate-800" />
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 text-9xl text-pink-500/5 pointer-events-none">🎉</div>
                
                <h2 className="text-2xl font-black text-white mb-8">{result.title}</h2>
                
                <div className="space-y-4 mb-8">
                  <h4 className="text-pink-500 font-black uppercase tracking-widest text-[10px]">Viral Content Ideas</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {result.ideas.map((idea, i) => (
                      <div key={i} className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 text-sm text-slate-300 font-medium">
                        <span className="text-pink-500 mr-2">✦</span> {idea}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-2xl mb-8">
                  <h5 className="text-amber-500 font-black text-[10px] uppercase mb-2">Special Promotion</h5>
                  <p className="text-sm text-slate-200 leading-relaxed font-bold">{result.promotion}</p>
                </div>

                <Feedback 
                  contentId={`seasonal-${Date.now()}`} 
                  contentType="strategy" 
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeasonalCampaign;
