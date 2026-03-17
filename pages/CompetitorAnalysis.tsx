import React, { useState } from 'react';
import { handleResponse, callGeminiProxy } from '../geminiService';
import ReactMarkdown from 'react-markdown';

const CompetitorAnalysis: React.FC = () => {
  const [competitorName, setCompetitorName] = useState('');
  const [competitorDetails, setCompetitorDetails] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!competitorName.trim()) return;
    setIsLoading(true);
    try {
      const response = await handleResponse(() => callGeminiProxy({
        model: 'gemini-3-pro-preview',
        contents: `With You Photo Studio အတွက် ပြိုင်ဘက် (Competitor) ကို လေ့လာဆန်းစစ်ပေးပါ။
        
        ပြိုင်ဘက်အမည်: ${competitorName}
        ပြိုင်ဘက်အကြောင်း အသေးစိတ်: ${competitorDetails}
        
        လိုအပ်ချက်များ:
        1. ၎င်းတို့၏ အားသာချက် (Strengths) နှင့် အားနည်းချက် (Weaknesses)။
        2. With You Photo Studio အနေဖြင့် ၎င်းတို့ထက် သာလွန်စေရန် လုပ်ဆောင်သင့်သည့် အချက် ၃ ချက်။
        3. စျေးကွက်ထဲတွင် မိမိကိုယ်ကို မည်သို့ နေရာချ (Positioning) သင့်သလဲ။
        
        မြန်မာဘာသာဖြင့်သာ အသေးစိတ် ရေးပေးပါ။`,
      }));
      setAnalysis(response.text || '');
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Competitor Analysis</h1>
          <p className="text-slate-400 mt-2 burmese-text">ပြိုင်ဘက်များကို လေ့လာပြီး စျေးကွက်တွင် အသာစီးရယူပါ။</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-2">
          <span className="text-amber-500 font-bold text-sm">Market Intelligence</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-8 shadow-xl">
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Competitor Name</label>
                <input
                  type="text"
                  value={competitorName}
                  onChange={(e) => setCompetitorName(e.target.value)}
                  placeholder="ဥပမာ - ABC Studio"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all burmese-text"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Details (Optional)</label>
                <textarea
                  value={competitorDetails}
                  onChange={(e) => setCompetitorDetails(e.target.value)}
                  placeholder="၎င်းတို့၏ စျေးနှုန်း၊ ဝန်ဆောင်မှု သို့မဟုတ် အားနည်းချက်များကို ရေးပေးပါ။"
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all burmese-text"
                />
              </div>
              <button
                onClick={handleAnalyze}
                disabled={isLoading || !competitorName.trim()}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-black py-4 rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>🔍</span>
                    <span>Analyze Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {analysis ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-8 shadow-xl min-h-[400px]">
              <div className="prose prose-invert prose-amber max-w-none burmese-text">
                <ReactMarkdown>{analysis}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
              <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center text-4xl mb-6">🔭</div>
              <h3 className="text-xl font-bold text-white mb-2">No Analysis Yet</h3>
              <p className="text-slate-500 max-w-sm">ပြိုင်ဘက်အမည်ကို ရိုက်ထည့်ပြီး Analyze လုပ်လိုက်ပါ။ စျေးကွက်ထဲမှာ ဘယ်လို အသာစီးယူရမလဲဆိုတာ ကျွန်မတို့ လေ့လာကြည့်ရအောင်။</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompetitorAnalysis;
