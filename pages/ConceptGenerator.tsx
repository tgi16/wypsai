import React, { useState } from 'react';
import { generateConcept } from '../geminiService';
import ReactMarkdown from 'react-markdown';
import { saveToLibrary } from '../firebase';

const ConceptGenerator: React.FC = () => {
  const [vibe, setVibe] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [concept, setConcept] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vibe) return;
    
    setLoading(true);
    try {
      const result = await generateConcept(vibe);
      setConcept(result);
    } catch (error) {
      console.error(error);
      alert("Concept ထုတ်ပေးလို့ မရပါဘူး။ ခဏနေမှ ပြန်စမ်းကြည့်ပါ။");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!concept) return;
    setIsSaving(true);
    const title = vibe.length > 30 ? vibe.substring(0, 30) + '...' : vibe;
    const success = await saveToLibrary(`Concept - ${title}`, 'Concept', concept);
    setIsSaving(false);
    if (success) {
      alert('Saved Library သို့ သိမ်းဆည်းပြီးပါပြီ!');
    } else {
      alert('သိမ်းဆည်းရာတွင် အခက်အခဲရှိနေပါသည်။');
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-2xl">
            ✨
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Moodboard & Concept</h2>
            <p className="text-slate-400">Customer လိုချင်သော ပုံစံအတွက် အိုင်ဒီယာများ ရှာဖွေရန်</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Customer လိုချင်သော Vibe / Theme</label>
            <textarea
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none h-32"
              placeholder="ဥပမာ - Vintage ဆန်ဆန်လေး ရိုက်ချင်တယ်၊ ဒါပေမယ့် Studio ထဲမှာပဲ ရိုက်မှာ။ အဝတ်အစားက ဘာရောင်ဝတ်ရမလဲ မသိဘူး။"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !vibe}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>အိုင်ဒီယာများ ရှာဖွေနေပါသည်...</span>
              </>
            ) : (
              <>
                <span>✨ Concept ထုတ်မည်</span>
              </>
            )}
          </button>
        </form>
      </div>

      {concept && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">အကြံပြုချက်များ</h3>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : '💾 Save to Library'}
            </button>
          </div>
          <div className="bg-slate-950 rounded-2xl p-6 md:p-8 border border-slate-800 prose prose-invert max-w-none burmese-text">
            <ReactMarkdown>{concept}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConceptGenerator;
