import React, { useState, useRef } from 'react';
import { generateContract } from '../geminiService';
import ReactMarkdown from 'react-markdown';
import { FALLBACK_STUDIO_PACKAGES, formatMmk, normalizeStudioPackages, POS_PACKAGE_CACHE_KEY, StudioPackage } from '../pricingCatalog';
import { saveGeneratedHistory } from '../generatedHistory';
import { AppTab } from '../types';

const readContractPackages = (): StudioPackage[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(POS_PACKAGE_CACHE_KEY) || 'null');
    if (Array.isArray(parsed?.packages) && parsed.packages.length > 0) {
      return normalizeStudioPackages(parsed.packages);
    }
  } catch {
    // Fall back to the POS master fallback below.
  }
  return normalizeStudioPackages(FALLBACK_STUDIO_PACKAGES);
};

const ContractGenerator: React.FC = () => {
  const packages = readContractPackages();
  const [clientName, setClientName] = useState('');
  const [packageType, setPackageType] = useState(() => {
    const firstPackage = packages[0];
    return firstPackage ? `${firstPackage.name} - ${formatMmk(firstPackage.price)}` : '';
  });
  const [date, setDate] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [contract, setContract] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !date) return;
    
    setLoading(true);
    try {
      const result = await generateContract(clientName, packageType, date, extraNotes);
      setContract(result);
    } catch (error) {
      console.error(error);
      alert("စာချုပ် ထုတ်ပေးလို့ မရပါဘူး။ ခဏနေမှ ပြန်စမ်းကြည့်ပါ။");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!contract) return;
    setIsSaving(true);
    try {
      saveGeneratedHistory({
        type: 'Contract',
        title: `Contract - ${clientName}`,
        subtitle: packageType,
        content: contract,
        tab: AppTab.CONTRACT_GEN,
      });
      alert('Saved Library သို့ သိမ်းဆည်းပြီးပါပြီ!');
    } catch {
      alert('သိမ်းဆည်းရာတွင် အခက်အခဲရှိနေပါသည်။');
    } finally {
      setIsSaving(false);
    }
  };

  const executePrint = () => {
    if (!contract) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Agreement - ${clientName}</title>
            <style>
              body { font-family: 'Arial', sans-serif; line-height: 1.6; padding: 40px; color: #333; }
              h1, h2, h3 { color: #111; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
              .footer { margin-top: 50px; display: flex; justify-content: space-between; }
              .sign-box { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 10px; margin-top: 50px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>With You Photo Studio</h1>
              <p>Taunggyi, Myanmar</p>
            </div>
            <div>
              ${contract.replace(/\n/g, '<br/>')}
            </div>
            <div class="footer">
              <div class="sign-box">Customer Signature</div>
              <div class="sign-box">Studio Signature</div>
            </div>
            <script>window.print(); window.close();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-2xl">
            📝
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Agreement Generator</h2>
            <p className="text-slate-400">Customer နှင့် သဘောတူညီချက် စာချုပ် ထုတ်ရန်</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Customer နာမည်</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                placeholder="ဥပမာ - ကိုအောင် & မမြ"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">ရိုက်ကူးမည့် ရက်စွဲ</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Package အမျိုးအစား</label>
            <select
              value={packageType}
              onChange={(e) => setPackageType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            >
              {packages.map(pkg => {
                const label = `${pkg.name} - ${formatMmk(pkg.price)} (${pkg.category} / ${pkg.subcategory})`;
                return (
                  <option key={pkg.id} value={label}>{label}</option>
                );
              })}
              {packages.length === 0 && (
                <option value="">POS package မရှိသေးပါ</option>
              )}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Package စျေးနှုန်းများကို Pricing tab မှ POS master data/cache အတိုင်းယူထားပါတယ်။
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">အထူးမှတ်ချက်များ (Optional)</label>
            <textarea
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none h-24"
              placeholder="ဥပမာ - မိတ်ကပ် အပြင်လူခေါ်မည်၊ ညနေ ၅ နာရီအထိ ရိုက်မည် စသဖြင့်..."
            />
          </div>

          <button
            type="submit"
            disabled={loading || !clientName || !date}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>စာချုပ် ရေးဆွဲနေပါသည်...</span>
              </>
            ) : (
              <>
                <span>📝 စာချုပ် ထုတ်မည်</span>
              </>
            )}
          </button>
        </form>
      </div>

      {contract && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="text-xl font-bold text-white">ထုတ်ပေးထားသော စာချုပ်</h3>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : '💾 Save to Library'}
              </button>
              <button
                onClick={executePrint}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
              >
                🖨️ Print / PDF
              </button>
            </div>
          </div>
          <div 
            ref={printRef}
            className="bg-slate-950 rounded-2xl p-6 md:p-8 border border-slate-800 prose prose-invert max-w-none burmese-text"
          >
            <ReactMarkdown>{contract}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractGenerator;
