
import React, { useState } from 'react';
import { generateSalesScripts } from '../geminiService';
import { SalesScript } from '../types';
import Feedback from '../components/Feedback';

const SalesScriptManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState<SalesScript | null>(null);
  const [customQuestion, setCustomQuestion] = useState('');

  const scenarios = [
    "ဈေးနှုန်းမေးမြန်းခြင်းကို ပညာသားပါပါ ဖြေကြားနည်း",
    "ဈေးကြီးတယ်လို့ ငြင်းတဲ့သူကို ပြန်လည်ဆွဲဆောင်နည်း",
    "Pre-wedding မှာ Unlimited မရကြောင်း ရှင်းပြနည်း",
    "Wedding/အလှူ မှာ Unlimited Softcopy ပါကြောင်း ပြောနည်း",
    "ရိုက်ကူးရေးပြီးသွားတဲ့ Client ကို Review တောင်းနည်း"
  ];

  const handleGenerate = async (scenario: string, custom?: string) => {
    setLoading(true);
    try {
      const data = await generateSalesScripts(scenario, custom);
      setScript(data);
    } catch (err) {
      alert("Script ထုတ်ပေးလို့ မရပါဘူး။");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 burmese-text pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-white">Messenger <span className="text-blue-500">Master</span></h1>
          <p className="text-slate-400 font-medium mt-1">Client များကို စွဲဆောင်မှုရှိရှိ အရောင်းပိတ်ပါ။</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: INPUTS */}
        <div className="lg:col-span-5 space-y-6">
          {/* Custom Question Box */}
          <div className="bg-slate-900/50 border border-slate-800 p-6 md:p-8 rounded-[2rem] shadow-xl backdrop-blur-sm">
            <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] block mb-4">Direct Client Question (မေးခွန်း ရိုက်ထည့်ရန်)</label>
            <textarea
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="ဥပမာ- 'အလှူပွဲရိုက်ရင် ပုံဘယ်နှစ်ပုံပေးလဲ?' လို့ မေးလာရင်..."
              className="w-full h-32 bg-slate-950 border border-slate-800 rounded-2xl p-5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm leading-relaxed text-slate-200 resize-none mb-4"
            />
            <button
              onClick={() => handleGenerate("Custom Question", customQuestion)}
              disabled={loading || !customQuestion.trim()}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded-xl font-black text-xs transition-all shadow-lg shadow-blue-900/20"
            >
              ASK AI ASSISTANT ✨
            </button>
          </div>

          {/* Presets */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">Standard Scenarios</h3>
            <div className="grid grid-cols-1 gap-2">
              {scenarios.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleGenerate(s)}
                  disabled={loading}
                  className="w-full text-left p-5 bg-slate-900/30 border border-slate-800/50 rounded-2xl hover:border-amber-500/30 hover:bg-slate-800/50 transition-all text-sm font-bold text-slate-300 group"
                >
                  <span className="opacity-40 group-hover:opacity-100 transition-opacity mr-2">💬</span> {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: RESULTS */}
        <div className="lg:col-span-7">
          {!script && !loading && (
            <div className="h-[500px] border-2 border-dashed border-slate-900 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-10">
              <div className="text-6xl mb-6 opacity-10">💬</div>
              <p className="text-slate-600 font-bold uppercase text-xs tracking-widest leading-relaxed max-w-xs">
                မေးခွန်းတစ်ခုခု ရိုက်ထည့်ပါ သို့မဟုတ် ဘယ်ဘက်မှ Scenario တစ်ခုကို ရွေးချယ်ပါ။
              </p>
            </div>
          )}

          {loading && (
            <div className="space-y-6">
              <div className="h-64 bg-slate-900/50 rounded-[2rem] animate-pulse border border-slate-800" />
              <div className="h-40 bg-slate-900/50 rounded-[2rem] animate-pulse border border-slate-800" />
            </div>
          )}

          {script && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 text-9xl text-blue-500/5 pointer-events-none">💬</div>
                
                <h4 className="text-blue-500 font-black mb-6 uppercase tracking-widest text-[10px]">AI Generated Closing Script</h4>
                
                <div className="bg-slate-950/80 p-8 rounded-3xl text-slate-200 text-sm md:text-base leading-relaxed border border-slate-800 mb-8 whitespace-pre-wrap font-medium shadow-inner">
                  {script.script}
                </div>
                
                <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-2xl mb-8">
                  <h5 className="text-amber-500 font-black text-[10px] uppercase mb-2 flex items-center gap-2">
                    <span>💡</span> Pro Tip for Closing
                  </h5>
                  <p className="text-xs text-slate-400 leading-relaxed italic">{script.proTip}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(script.script);
                      alert("Copy ကူးယူပြီးပါပြီ!");
                    }}
                    className="py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-xs transition-all border border-slate-700 shadow-lg"
                  >
                    📋 COPY TO CLIPBOARD
                  </button>
                  <a 
                    href="https://www.facebook.com/messages/t/wypstudio" 
                    target="_blank"
                    className="py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs text-center transition-all shadow-lg shadow-blue-900/30"
                  >
                    🚀 SEND TO MESSENGER
                  </a>
                </div>
                
                <Feedback 
                  contentId={`sales-${Date.now()}`} 
                  contentType="sales" 
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesScriptManager;
