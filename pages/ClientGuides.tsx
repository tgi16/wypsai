import React, { useState, useEffect, useRef } from 'react';
import { generateClientGuide } from '../geminiService';
import { ClientGuide } from '../types';
import Feedback from '../components/Feedback';
import html2canvas from 'html2canvas';

interface GuideHistory {
  id: string;
  date: string;
  topic: string;
  content: ClientGuide;
}

const ClientGuides: React.FC = () => {
  const [topic, setTopic] = useState('Pre-wedding အတွက် ကြိုတင်ပြင်ဆင်ရန်');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClientGuide | null>(null);
  const [history, setHistory] = useState<GuideHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const commonTopics = [
    'Pre-wedding (Indoor) အတွက် ကြိုတင်ပြင်ဆင်ရန်',
    'Pre-wedding (Outdoor) အတွက် ကြိုတင်ပြင်ဆင်ရန်',
    'Family Shoot အတွက် ကလေးများအား ပြင်ဆင်ခြင်း',
    'Solo/Birthday Shoot အတွက် Pose & Outfit',
    'Outdoor Portrait ရိုက်ကူးရေး'
  ];

  useEffect(() => {
    const saved = localStorage.getItem('wyp_guide_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  const saveToHistory = (content: ClientGuide) => {
    const newEntry: GuideHistory = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      topic,
      content
    };
    const updatedHistory = [newEntry, ...history].slice(0, 20);
    setHistory(updatedHistory);
    localStorage.setItem('wyp_guide_history', JSON.stringify(updatedHistory));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const data = await generateClientGuide(topic);
      setResult(data);
      saveToHistory(data);
    } catch (error) {
      console.error(error);
      alert("Guide ရေးပေးလို့ မရပါဘူး။");
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
    localStorage.setItem('wyp_guide_history', JSON.stringify(updated));
  };

  const formatForCopy = (guide: ClientGuide) => {
    return `${guide.title}\n\n${guide.intro}\n\n💡 အကြံပြုချက်များ:\n${guide.tips.map(t => `• ${t}`).join('\n')}\n\n✅ မေ့မကျန်စေရန် Checklist:\n${guide.checklist.map(c => `- ${c}`).join('\n')}\n\n${guide.outro}`;
  };

  const handleShare = async () => {
    if (!printRef.current || !result) return;
    try {
      setToastMsg("ဓာတ်ပုံအဖြစ် ပြောင်းနေပါသည်... ⏳");
      
      // Temporarily adjust styles for better image capture if needed
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#020617', // slate-950
        logging: false,
        useCORS: true
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'WithYou_ClientGuide.png', { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: result.title,
              text: 'With You Photo Studio မှ ကြိုတင်ပြင်ဆင်ရန် လမ်းညွှန်',
            });
            setToastMsg("Share လုပ်ခြင်း အောင်မြင်ပါသည် ✨");
          } catch (err) {
            console.log("Share cancelled", err);
            setToastMsg("");
          }
        } else {
          // Fallback to download
          const link = document.createElement('a');
          link.download = 'WithYou_ClientGuide.png';
          link.href = canvas.toDataURL('image/png');
          link.click();
          setToastMsg("ဓာတ်ပုံကို Download ဆွဲပြီးပါပြီ 📥");
        }
      }, 'image/png');
    } catch (error) {
      console.error("Error generating image:", error);
      setToastMsg("အမှားအယွင်းဖြစ်ပွားပါသည် ❌");
    }
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
          <h1 className="text-3xl md:text-5xl font-black text-white">Client <span className="text-amber-500">Guides</span></h1>
          <p className="text-slate-400 font-medium mt-1">Customer များအတွက် ကြိုတင်ပြင်ဆင်ရန် လမ်းညွှန်များ</p>
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
          <h2 className="text-xl font-black text-white">ယခင်ရေးခဲ့သော Guides များ</h2>
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
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-[10px] font-bold">{h.topic}</span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-4 h-32 overflow-y-auto">
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">{h.content.title}</p>
                    <p className="text-[10px] text-slate-500 mt-2 line-clamp-3">{h.content.intro}</p>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(formatForCopy(h.content))}
                    className="w-full py-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white rounded-xl font-bold text-xs transition-colors"
                  >
                    COPY FULL GUIDE
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
              <label className="block text-sm font-bold text-slate-300 mb-3">အကြောင်းအရာ ရွေးချယ်ပါ</label>
              <div className="flex flex-wrap gap-3">
                {commonTopics.map(t => (
                  <button
                    key={t}
                    onClick={() => setTopic(t)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      topic === t 
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' 
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-amber-500/50 hover:text-amber-500'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="အခြား အကြောင်းအရာ ရိုက်ထည့်ရန်..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-5 focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm text-slate-200"
              />
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="md:w-48 py-5 bg-gradient-to-r from-amber-600 to-amber-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 rounded-2xl font-black text-slate-950 shadow-xl shadow-amber-900/20 transition-all flex items-center justify-center gap-3"
              >
                {loading ? <div className="animate-spin h-5 w-5 border-2 border-slate-950 border-t-transparent rounded-full" /> : "GENERATE 📖"}
              </button>
            </div>
          </div>

          {loading && (
            <div className="h-64 bg-slate-900/50 rounded-[2rem] animate-pulse border border-slate-800" />
          )}

          {result && (
            <div className="animate-in slide-in-from-bottom-8 duration-500">
              {/* Action Buttons */}
              <div className="flex flex-wrap justify-end gap-3 mb-6">
                <button 
                  onClick={() => copyToClipboard(formatForCopy(result))}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs transition-colors border border-slate-700 flex items-center gap-2"
                >
                  <span>📋</span> COPY TEXT
                </button>
                <button 
                  onClick={handleShare}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs transition-colors shadow-lg shadow-amber-500/20 flex items-center gap-2"
                >
                  <span>📤</span> SHARE AS IMAGE
                </button>
              </div>

              {/* Capturable Area */}
              <div 
                ref={printRef} 
                className="bg-[#020617] border border-slate-800 rounded-[2rem] p-8 md:p-12 relative overflow-hidden shadow-2xl"
              >
                {/* Top Accent Line */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600"></div>
                
                {/* Studio Branding */}
                <div className="text-center mb-10 pt-4">
                  <h1 className="text-2xl font-black tracking-widest text-white">WITH YOU</h1>
                  <p className="text-amber-500 text-[9px] font-black uppercase tracking-[0.3em] mt-1">Photo Studio</p>
                </div>

                <div className="max-w-3xl mx-auto space-y-8">
                  <div className="text-center space-y-4">
                    <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">{result.title}</h2>
                    <p className="text-slate-300 leading-relaxed text-sm md:text-base">{result.intro}</p>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 p-6 md:p-8 rounded-2xl">
                    <h3 className="text-amber-500 font-black mb-5 flex items-center gap-3 text-lg">
                      <span className="bg-amber-500/10 p-2 rounded-lg">💡</span> အရေးကြီးသော အကြံပြုချက်များ
                    </h3>
                    <ul className="space-y-4">
                      {result.tips.map((tip, i) => (
                        <li key={i} className="text-slate-200 text-sm md:text-base flex items-start gap-4 leading-relaxed">
                          <span className="text-amber-500 mt-1 text-lg">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 p-6 md:p-8 rounded-2xl">
                    <h3 className="text-blue-400 font-black mb-5 flex items-center gap-3 text-lg">
                      <span className="bg-blue-500/10 p-2 rounded-lg">✅</span> မေ့မကျန်စေရန် Checklist
                    </h3>
                    <ul className="space-y-4">
                      {result.checklist.map((item, i) => (
                        <li key={i} className="text-slate-200 text-sm md:text-base flex items-start gap-4 leading-relaxed">
                          <span className="text-blue-400 mt-1 text-lg">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Footer */}
                  <div className="mt-12 pt-8 border-t border-slate-800/50 text-center">
                    <p className="text-slate-400 text-sm italic mb-6">{result.outro}</p>
                    <div className="inline-block bg-slate-900 px-6 py-2 rounded-full border border-slate-800">
                      <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Taunggyi • Premium Photography</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <Feedback contentId={`guide-${Date.now()}`} contentType="marketing" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ClientGuides;
