
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { AppTab } from './types';
import { DAILY_BUDGET, MENU_GROUPS } from './constants';
import Sidebar from './components/Sidebar';
import { FirebaseProvider } from './components/FirebaseContext';
import { ErrorBoundary } from './components/ErrorBoundary';

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
const ClientReminder = lazy(() => import('./pages/ClientReminder'));
const ClientMessageCenter = lazy(() => import('./pages/ClientMessageCenter'));
const PosBookingTracker = lazy(() => import('./pages/PosBookingTracker'));
const PremiumPromotions = lazy(() => import('./pages/PremiumPromotions'));
const AutoReplyBuilder = lazy(() => import('./pages/AutoReplyBuilder'));
const VoiceoverGenerator = lazy(() => import('./pages/VoiceoverGenerator'));
const StrategyPartner = lazy(() => import('./pages/StrategyPartner'));
const ContractGenerator = lazy(() => import('./pages/ContractGenerator'));
const ConceptGenerator = lazy(() => import('./pages/ConceptGenerator'));
const SavedLibrary = lazy(() => import('./pages/SavedLibrary'));
const ClientTimeline = lazy(() => import('./pages/ClientTimeline'));
const ContentApprovalBoard = lazy(() => import('./pages/ContentApprovalBoard'));
const CompetitorAnalysis = lazy(() => import('./pages/CompetitorAnalysis'));
const DailyPlanPage = lazy(() => import('./pages/DailyPlan'));
const MarketingAudit = lazy(() => import('./pages/MarketingAudit'));
const AppHealth = lazy(() => import('./pages/AppHealth'));
const TokenManager = lazy(() => import('./pages/TokenManager'));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const normalizeUsage = (raw: any) => ({
  totalCost: Number(raw?.totalCost) || 0,
  count: Number(raw?.count) || 0,
  lastCost: Number(raw?.lastCost) || 0,
});

const getUsageDayKey = () => new Date().toLocaleDateString('en-CA');

const BUDGET_ALERT_KEY = 'wyps_budget_alert_shown';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [usage, setUsage] = useState({ totalCost: 0, count: 0, lastCost: 0 });
  const [budgetToast, setBudgetToast] = useState<{ msg: string; level: 'warn' | 'danger' } | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const activeItem = MENU_GROUPS.flatMap(group => group.items).find(item => item.id === activeTab);
  const mobileQuickTabs = [
    { id: AppTab.DASHBOARD, label: 'Today', icon: '🏠' },
    { id: AppTab.CONTENT_GEN, label: 'Post', icon: '✍️' },
    { id: AppTab.POS_BOOKING_TRACKER, label: 'Booking', icon: '🏪' },
    { id: AppTab.CLIENT_MESSAGE_CENTER, label: 'Message', icon: '💬' },
  ];

  const loadUsage = () => {
    const today = getUsageDayKey();
    const savedUsage = JSON.parse(localStorage.getItem('gemini_usage_v2') || '{}');
    if (savedUsage[today]) {
      setUsage(normalizeUsage(savedUsage[today]));
    }
  };

  useEffect(() => {
    loadUsage();
    const handleUpdate = (event: any) => {
      const updated = normalizeUsage(event.detail);
      setUsage(updated);

      // Budget alert — show once per day per threshold
      const pct = (updated.totalCost / DAILY_BUDGET) * 100;
      const today = getUsageDayKey();
      const shownKey = `${BUDGET_ALERT_KEY}_${today}`;
      const alreadyShown = localStorage.getItem(shownKey) || '';

      if (pct >= 100 && !alreadyShown.includes('100')) {
        setBudgetToast({ msg: `Budget $${DAILY_BUDGET} ပြည့်သွားပြီ။ မနက်ဖြန်မှ ပြန်သုံးနိုင်မည်။`, level: 'danger' });
        localStorage.setItem(shownKey, alreadyShown + '|100');
      } else if (pct >= 80 && !alreadyShown.includes('80')) {
        setBudgetToast({ msg: `Budget 80% ကျော်ပြီ ($${updated.totalCost.toFixed(3)} / $${DAILY_BUDGET})။ သတိထားပါ။`, level: 'warn' });
        localStorage.setItem(shownKey, alreadyShown + '|80');
      }
    };
    window.addEventListener('gemini_usage_updated', handleUpdate);
    return () => window.removeEventListener('gemini_usage_updated', handleUpdate);
  }, []);

  const budget = DAILY_BUDGET;
  const percentage = Math.min((usage.totalCost / budget) * 100, 100);
  const progressWidth = usage.totalCost > 0 ? Math.max(percentage, 1) : 0;

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
      case AppTab.CLIENT_REMINDER:
        return <ClientReminder key="client-reminder" />;
      case AppTab.CLIENT_MESSAGE_CENTER:
        return <ClientMessageCenter key="client-message-center" />;
      case AppTab.POS_BOOKING_TRACKER:
        return <PosBookingTracker key="pos-booking-tracker" onNavigate={setActiveTab} />;
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
        return <SavedLibrary key="saved-library" onNavigate={setActiveTab} />;
      case AppTab.CLIENT_TIMELINE:
        return <ClientTimeline key="client-timeline" onNavigate={setActiveTab} />;
      case AppTab.CONTENT_APPROVAL:
        return <ContentApprovalBoard key="content-approval" onNavigate={setActiveTab} />;
      case AppTab.COMPETITOR_ANALYSIS:
        return <CompetitorAnalysis key="competitor-analysis" />;
      case AppTab.MARKETING_AUDIT:
        return <MarketingAudit key="marketing-audit" onNavigateToContent={(topic) => {
          localStorage.setItem('wyp_content_topic', topic);
          setActiveTab(AppTab.CONTENT_GEN);
        }} />;
      case AppTab.APP_HEALTH:
        return <AppHealth key="app-health" />;
      case AppTab.TOKEN_MANAGER:
        return <TokenManager key="token-manager" />;
      default:
        return <Dashboard key="dashboard-default" onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-hidden bg-[#0b1120] text-slate-200 font-sans md:flex-row">

      {/* Budget Alert Toast */}
      {budgetToast && (
        <div className={`fixed top-4 left-1/2 z-[200] -translate-x-1/2 flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl transition-all duration-300 max-w-sm w-[92vw] ${
          budgetToast.level === 'danger'
            ? 'border-red-500/40 bg-red-950/90 text-red-200'
            : 'border-amber-500/40 bg-amber-950/90 text-amber-200'
        }`}>
          <span className="text-xl shrink-0">{budgetToast.level === 'danger' ? '🚫' : '⚠️'}</span>
          <p className="text-xs font-bold leading-snug flex-1 burmese-text">{budgetToast.msg}</p>
          <button
            onClick={() => setBudgetToast(null)}
            className="shrink-0 text-lg opacity-60 hover:opacity-100 transition-opacity"
          >✕</button>
        </div>
      )}
      {/* Desktop Sidebar (Mac) */}
      <div className="hidden md:block">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Mobile Header */}
      <div className="fixed inset-x-0 top-0 z-[100] border-b border-slate-800 bg-[#020617]/98 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-2xl backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`h-12 w-12 shrink-0 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl transition-all duration-300 ${isMobileMenuOpen ? 'rotate-90 text-amber-500' : 'text-slate-300'}`}
            aria-label="Open menu"
          >
            <span className="text-2xl">{isMobileMenuOpen ? '✕' : '☰'}</span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500">WYPSAI</p>
            <h1 className="truncate text-sm font-black text-white burmese-text">{activeItem?.label || 'With You Studio'}</h1>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-right">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">AI</div>
            <div className="text-[11px] font-black text-amber-400">${usage.totalCost.toFixed(3)}</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main 
        ref={mainRef}
        className="flex-1 overflow-y-auto p-3 pt-[calc(5.5rem+env(safe-area-inset-top))] pb-[calc(7.5rem+env(safe-area-inset-bottom))] scroll-smooth sm:p-4 sm:pt-[calc(5.75rem+env(safe-area-inset-top))] md:p-10 lg:p-12"
      >
        <div className="mx-auto w-full max-w-6xl transition-all duration-300">
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              {renderContent()}
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[90] bg-[#020617] md:hidden">
          <button
            type="button"
            aria-label="Close menu background"
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute inset-0 bg-[#020617]"
          />
          <div className="absolute inset-x-0 bottom-0 top-[calc(4.75rem+env(safe-area-inset-top))] overflow-y-auto overscroll-contain bg-[#020617] px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-4 custom-scrollbar animate-in slide-in-from-top-2 duration-200">
          <div className="mb-4 rounded-[1.5rem] border border-slate-800 bg-slate-900 p-4 shadow-2xl">
            <div className="text-left">
              <h1 className="text-xl font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent tracking-tighter leading-tight">
                WITH YOU STUDIO
              </h1>
              <div className="h-1 w-8 bg-amber-500 mt-1 rounded-full"></div>
              <p className="mt-3 text-[11px] font-bold leading-relaxed text-slate-400 burmese-text">
                မိုဘိုင်းမှာ မြန်မြန်ရွေးသုံးနိုင်အောင် menu ကို list ပုံစံနဲ့ပြထားပါတယ်။
              </p>
            </div>
          </div>
          <div className="space-y-4">
             {MENU_GROUPS.map(group => (
                <section key={group.title}>
                   {group.title !== 'Main' && (
                     <h3 className="mb-2 px-1 text-[10px] font-black uppercase tracking-widest text-slate-500">{group.title}</h3>
                   )}
                   <div className="space-y-2">
                      {group.items.map((item) => {
                        const isActive = activeTab === item.id;
                        const featured = Boolean(item.featured);
                        return (
                          <button
                            key={item.id}
                            onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                            className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${
                              isActive
                                ? featured
                                  ? 'bg-sky-500/15 border-sky-400/35 text-sky-200'
                                  : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                                : featured
                                  ? 'bg-slate-900/50 border-sky-500/25 text-slate-200 hover:bg-slate-800'
                                  : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-lg">{item.icon}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-bold leading-6 burmese-text">{item.label}</span>
                              {item.subtitle && (
                                <span className="block truncate text-[11px] leading-5 text-slate-500 burmese-text">{item.subtitle}</span>
                              )}
                            </span>
                            <span className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-amber-400' : 'bg-slate-700'}`} />
                          </button>
                        );
                      })}
                   </div>
                </section>
             ))}
             {/* Mobile Usage Tracker */}
             <div className="mt-5 rounded-[1.75rem] border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">API Usage (Today)</span>
                  <span className="text-xs font-black text-amber-500">${usage.totalCost.toFixed(4)} / ${budget.toFixed(2)}</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden mb-3">
                  <div 
                    className={`h-full transition-all duration-1000 ${percentage > 80 ? 'bg-red-500' : percentage > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${progressWidth}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>{usage.count} calls made</span>
                  <span className="text-slate-600">{percentage.toFixed(2)}%</span>
                </div>
             </div>
          </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Quick Nav */}
      {!isMobileMenuOpen && (
      <div className="md:hidden fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[80] rounded-[1.5rem] border border-slate-800 bg-[#020617]/95 p-2 shadow-2xl backdrop-blur-xl">
        <div className="grid grid-cols-4 gap-1">
          {mobileQuickTabs.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`rounded-2xl px-2 py-2 text-center transition-all ${isActive ? 'bg-amber-500 text-slate-950' : 'text-slate-500'}`}
              >
                <div className="text-lg leading-none">{item.icon}</div>
                <div className="mt-1 text-[9px] font-black uppercase tracking-tight">{item.label}</div>
              </button>
            );
          })}
        </div>
      </div>
      )}

    </div>
  );
};

const AppWrapper: React.FC = () => (
  <FirebaseProvider>
    <App />
  </FirebaseProvider>
);

export default AppWrapper;
