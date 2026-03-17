
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { AppTab } from './types';
import { MENU_GROUPS } from './constants';
import Sidebar from './components/Sidebar';
import { FirebaseProvider } from './components/FirebaseContext';

// Lazy load page components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ContentGenerator = lazy(() => import('./pages/ContentGenerator'));
const PricingGuide = lazy(() => import('./pages/PricingGuide'));
const SalesScriptManager = lazy(() => import('./pages/SalesScriptManager'));
const HashtagStrategy = lazy(() => import('./pages/HashtagStrategy'));
const PortfolioBio = lazy(() => import('./pages/PortfolioBio'));
const ReviewReply = lazy(() => import('./pages/ReviewReply'));
const SeasonalCampaign = lazy(() => import('./pages/SeasonalCampaign'));
const SevenDayPlan = lazy(() => import('./pages/SevenDayPlan'));
const EngagementPosts = lazy(() => import('./pages/EngagementPosts'));
const ClientGuides = lazy(() => import('./pages/ClientGuides'));
const PremiumPromotions = lazy(() => import('./pages/PremiumPromotions'));
const AutoReplyBuilder = lazy(() => import('./pages/AutoReplyBuilder'));
const VoiceoverGenerator = lazy(() => import('./pages/VoiceoverGenerator'));
const StrategyPartner = lazy(() => import('./pages/StrategyPartner'));
const ContractGenerator = lazy(() => import('./pages/ContractGenerator'));
const ConceptGenerator = lazy(() => import('./pages/ConceptGenerator'));
const SavedLibrary = lazy(() => import('./pages/SavedLibrary'));
const CompetitorAnalysis = lazy(() => import('./pages/CompetitorAnalysis'));
const DailyPlanPage = lazy(() => import('./pages/DailyPlan'));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [usage, setUsage] = useState({ totalCost: 0, count: 0, lastCost: 0 });
  const mainRef = useRef<HTMLDivElement>(null);

  const loadUsage = () => {
    const today = new Date().toISOString().split('T')[0];
    const savedUsage = JSON.parse(localStorage.getItem('gemini_usage_v2') || '{}');
    if (savedUsage[today]) {
      setUsage(savedUsage[today]);
    }
  };

  useEffect(() => {
    loadUsage();
    const handleUpdate = (event: any) => {
      setUsage(event.detail);
    };
    window.addEventListener('gemini_usage_updated', handleUpdate);
    return () => window.removeEventListener('gemini_usage_updated', handleUpdate);
  }, []);

  const budget = 5.0;
  const percentage = Math.min((usage.totalCost / budget) * 100, 100);

  // Reset scroll to top when tab changes to prevent layout ghosting
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [activeTab]);

  const renderContent = () => {
    // Adding unique keys to each component to ensure clean re-mounts
    switch (activeTab) {
      case AppTab.DASHBOARD:
        return <Dashboard key="dashboard" onNavigate={setActiveTab} />;
      case AppTab.CONTENT_GEN:
        return <ContentGenerator key="content-gen" onNavigate={setActiveTab} />;
      case AppTab.SALES_SCRIPTS:
        return <SalesScriptManager key="sales-scripts" />;
      case AppTab.STRATEGY:
        return <DailyPlanPage key="daily-plan" onNavigate={setActiveTab} />;
      case AppTab.PRICING:
        return <PricingGuide key="pricing" />;
      case AppTab.HASHTAGS:
        return <HashtagStrategy key="hashtags" />;
      case AppTab.PORTFOLIO_BIO:
        return <PortfolioBio key="portfolio-bio" />;
      case AppTab.REVIEW_REPLY:
        return <ReviewReply key="review-reply" />;
      case AppTab.SEASONAL_CAMPAIGN:
        return <SeasonalCampaign key="seasonal-campaign" />;
      case AppTab.SEVEN_DAY_PLAN:
        return <SevenDayPlan key="seven-day-plan" />;
      case AppTab.ENGAGEMENT_POSTS:
        return <EngagementPosts key="engagement-posts" />;
      case AppTab.CLIENT_GUIDES:
        return <ClientGuides key="client-guides" />;
      case AppTab.PREMIUM_PROMOTIONS:
        return <PremiumPromotions key="premium-promotions" />;
      case AppTab.AUTO_REPLY:
        return <AutoReplyBuilder key="auto-reply" />;
      case AppTab.VOICEOVER_GEN:
        return <VoiceoverGenerator key="voiceover-gen" />;
      case AppTab.STRATEGY_PARTNER:
        return <StrategyPartner key="strategy-partner" />;
      case AppTab.CONTRACT_GEN:
        return <ContractGenerator key="contract-gen" />;
      case AppTab.CONCEPT_GEN:
        return <ConceptGenerator key="concept-gen" />;
      case AppTab.SAVED_LIBRARY:
        return <SavedLibrary key="saved-library" />;
      case AppTab.COMPETITOR_ANALYSIS:
        return <CompetitorAnalysis key="competitor-analysis" />;
      default:
        return <Dashboard key="dashboard-default" onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#0b1120] text-slate-200 overflow-hidden font-sans">
      {/* Desktop Sidebar (Mac) */}
      <div className="hidden md:block">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Main Content Area */}
      <main 
        ref={mainRef}
        className="flex-1 overflow-y-auto pb-24 md:pb-8 p-4 md:p-10 lg:p-12 scroll-smooth"
      >
        <div className="max-w-6xl mx-auto w-full transition-all duration-300">
          <Suspense fallback={<PageLoader />}>
            {renderContent()}
          </Suspense>
        </div>
      </main>

      {/* Mobile Bottom Navigation (iPhone) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-2xl border-t border-slate-800 px-2 py-3 z-50 flex justify-around items-center shadow-2xl shadow-black">
        <MobileNavItem id={AppTab.DASHBOARD} icon="🏠" label="Home" active={activeTab === AppTab.DASHBOARD && !isMobileMenuOpen} onClick={(id: AppTab) => { setActiveTab(id); setIsMobileMenuOpen(false); }} />
        <MobileNavItem id={AppTab.CONTENT_GEN} icon="✍️" label="Post" active={activeTab === AppTab.CONTENT_GEN && !isMobileMenuOpen} onClick={(id: AppTab) => { setActiveTab(id); setIsMobileMenuOpen(false); }} />
        <MobileNavItem id={AppTab.STRATEGY_PARTNER} icon="🧠" label="Partner" active={activeTab === AppTab.STRATEGY_PARTNER && !isMobileMenuOpen} onClick={(id: AppTab) => { setActiveTab(id); setIsMobileMenuOpen(false); }} />
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`flex flex-col items-center gap-1 flex-1 transition-all duration-300 ${isMobileMenuOpen ? 'text-amber-500 scale-110' : 'text-slate-500'}`}
        >
          <div className={`p-1 rounded-xl transition-all ${isMobileMenuOpen ? 'bg-amber-500/10' : ''}`}>
            <span className="text-xl">☰</span>
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter">Menu</span>
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-950/95 backdrop-blur-xl pt-8 pb-24 px-4 overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center mb-8 px-2">
            <h2 className="text-xl font-black text-amber-500 tracking-widest uppercase">All Features</h2>
            <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 text-4xl hover:text-white transition-colors">&times;</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
             {MENU_GROUPS.map(group => (
                <div key={group.title} className="col-span-2 mb-2">
                   {group.title !== 'Main' && (
                     <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-2">{group.title}</h3>
                   )}
                   <div className="grid grid-cols-2 gap-3">
                      {group.items.map(item => (
                         <button
                           key={item.id}
                           onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                           className={`flex flex-col items-start p-4 rounded-2xl border text-left transition-all ${activeTab === item.id ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800'}`}
                         >
                           <span className="text-2xl mb-2">{item.icon}</span>
                           <span className="text-xs font-bold leading-tight burmese-text">{item.label}</span>
                         </button>
                      ))}
                   </div>
                </div>
             ))}

             {/* Mobile Usage Tracker */}
             <div className="col-span-2 mt-4 p-6 bg-slate-900/50 rounded-[2rem] border border-slate-800/50">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">API Usage (Today)</span>
                  <span className="text-xs font-black text-amber-500">${usage.totalCost.toFixed(3)} / $5</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden mb-3">
                  <div 
                    className={`h-full transition-all duration-1000 ${percentage > 80 ? 'bg-red-500' : percentage > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>{usage.count} calls made</span>
                  <span className="text-slate-600">Limit: $5.00</span>
                </div>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

const MobileNavItem = ({ id, icon, label, active, onClick }: any) => (
  <button 
    onClick={() => onClick(id)}
    className={`flex flex-col items-center gap-1 flex-1 transition-all duration-300 ${active ? 'text-amber-500 scale-110' : 'text-slate-500'}`}
  >
    <div className={`p-1 rounded-xl transition-all ${active ? 'bg-amber-500/10' : ''}`}>
      <span className="text-xl">{icon}</span>
    </div>
    <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

const AppWrapper: React.FC = () => (
  <FirebaseProvider>
    <App />
  </FirebaseProvider>
);

export default AppWrapper;
