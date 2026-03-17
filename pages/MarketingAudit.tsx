import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, AlertCircle, CheckCircle2, ArrowRight, ClipboardList, Sparkles, Image as ImageIcon, X, Upload } from 'lucide-react';
import { runMarketingAudit } from '../geminiService';
import imageCompression from 'browser-image-compression';

interface MarketingAuditProps {
  onNavigateToContent: (topic: string) => void;
}

const MarketingAudit: React.FC<MarketingAuditProps> = ({ onNavigateToContent }) => {
  const [data, setData] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [auditResult, setAuditResult] = useState<{
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: { topic: string; reason: string; strategy: string }[];
  } | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error("Image compression error:", error);
    }
  };

  const handleAudit = async () => {
    if (!data.trim() && !image) return;
    setIsLoading(true);
    try {
      const result = await runMarketingAudit(data, image || undefined);
      setAuditResult(result);
    } catch (error) {
      console.error("Audit Error:", error);
      alert("Analysis လုပ်ရာတွင် အခက်အခဲရှိနေပါသည်။ ခဏနေမှ ပြန်လည်ကြိုးစားပေးပါ။");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 mb-4">
          <BarChart3 size={32} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Marketing Audit & Analytics</h1>
        <p className="text-gray-600">Insights များကို AI ဖြင့် ခွဲခြမ်းစိတ်ဖြာပြီး Content Strategy အသစ်များ ဖော်ထုတ်ပါ။</p>
      </header>

      {!auditResult ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                <ClipboardList size={18} className="text-indigo-500" />
                Insights Data (စာသားဖြင့် ထည့်သွင်းရန်)
              </label>
              <textarea
                value={data}
                onChange={(e) => setData(e.target.value)}
                placeholder="ဥပမာ - Reach: 50,000, Engagement: 2,500..."
                className="w-full h-48 p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none font-mono text-sm"
              />
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                <ImageIcon size={18} className="text-indigo-500" />
                Insights Screenshot (ပုံဖြင့် ထည့်သွင်းရန်)
              </label>
              
              {!image ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-100 transition-all">
                    <Upload className="text-gray-400 group-hover:text-indigo-600" size={24} />
                  </div>
                  <span className="text-sm text-gray-500 font-medium">Screenshot တင်ရန် နှိပ်ပါ</span>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              ) : (
                <div className="relative w-full h-48 rounded-xl overflow-hidden border border-gray-200">
                  <img src={image} alt="Insights Screenshot" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setImage(null)}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-indigo-50 rounded-xl p-4 flex items-start gap-3">
            <Sparkles className="text-indigo-600 mt-1 flex-shrink-0" size={18} />
            <p className="text-sm text-indigo-700 leading-relaxed">
              <strong>Tip:</strong> Insights Summary ကို စာသားဖြင့်ဖြစ်စေ၊ Screenshot ရိုက်ပြီးဖြစ်စေ ထည့်သွင်းနိုင်ပါတယ်။ AI က အချက်အလက်များကို အလိုအလျောက် ဖတ်ယူသွားမှာ ဖြစ်ပါတယ်။
            </p>
          </div>

          <button
            onClick={handleAudit}
            disabled={isLoading || (!data.trim() && !image)}
            className={`w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
              isLoading || (!data.trim() && !image) ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200'
            }`}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <TrendingUp size={20} />
                RUN STRATEGIC AUDIT
              </>
            )}
          </button>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {/* Summary Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-8 text-white shadow-xl"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Sparkles size={24} />
              AI Strategic Summary
            </h2>
            <p className="text-indigo-50 leading-relaxed text-lg italic">
              "{auditResult.summary}"
            </p>
          </motion.div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm">
              <h3 className="text-lg font-bold text-emerald-700 mb-4 flex items-center gap-2">
                <CheckCircle2 size={20} />
                Strengths (အားသာချက်များ)
              </h3>
              <ul className="space-y-3">
                {auditResult.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-rose-100 shadow-sm">
              <h3 className="text-lg font-bold text-rose-700 mb-4 flex items-center gap-2">
                <AlertCircle size={20} />
                Weaknesses (အားနည်းချက်များ)
              </h3>
              <ul className="space-y-3">
                {auditResult.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 flex-shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList size={24} className="text-indigo-600" />
              Next Month Action Plan (အကြံပြုချက်များ)
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {auditResult.recommendations.map((rec, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:border-indigo-200 transition-all group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-lg font-bold text-indigo-600">{rec.topic}</h4>
                      <p className="text-sm text-gray-500">{rec.reason}</p>
                      <p className="text-gray-700 mt-2 leading-relaxed">{rec.strategy}</p>
                    </div>
                    <button
                      onClick={() => onNavigateToContent(rec.topic)}
                      className="flex-shrink-0 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 group-hover:shadow-md"
                    >
                      GENERATE POST
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              setAuditResult(null);
              setData('');
            }}
            className="w-full py-4 text-gray-500 font-medium hover:text-indigo-600 transition-all"
          >
            ← Start New Analysis
          </button>
        </div>
      )}
    </div>
  );
};

export default MarketingAudit;
