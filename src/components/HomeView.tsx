import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  BedDouble,
  Briefcase,
  Bus,
  Calendar,
  ChevronRight,
  CreditCard,
  MessageCircle,
  MessageSquare,
  Mountain,
  Newspaper,
  PhoneCall,
  Pin,
  Sparkles,
  Store,
  Users,
} from 'lucide-react';
import { HERO_BANNERS } from '../data/seedData';
import {
  EXPLORE_MODULES,
  formatRelativeTime,
  formatViews,
  type Complaint,
  type ExploreModuleId,
  type NewsArticle,
  type UserProfile,
} from '../types/wdm';

interface HomeViewProps {
  profile: UserProfile;
  news: NewsArticle[];
  complaints: Complaint[];
  searchQuery: string;
  onSelectModule: (moduleId: ExploreModuleId) => void;
  onTogglePin: (moduleId: ExploreModuleId) => void;
  onOpenCitizenCard: () => void;
}

const MODULE_ICONS: Record<ExploreModuleId, React.FC<{ className?: string }>> = {
  influencer_meet: Award,
  creators: Users,
  whatsapp: MessageCircle,
  chat: MessageSquare,
  shop: Store,
  transport: Bus,
  tourist: Mountain,
  news: Newspaper,
  job: Briefcase,
  festival: Sparkles,
  event: Calendar,
  complaints: AlertCircle,
  room: BedDouble,
  helpline: PhoneCall,
};

export const HomeView: React.FC<HomeViewProps> = ({
  profile,
  news,
  complaints,
  searchQuery,
  onSelectModule,
  onTogglePin,
  onOpenCitizenCard,
}) => {
  const [bannerIndex, setBannerIndex] = useState(0);
  const [pinEditMode, setPinEditMode] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % HERO_BANNERS.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, []);

  const pinnedSet = useMemo(() => new Set(profile.pinnedModules || []), [profile.pinnedModules]);

  const sortedModules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? EXPLORE_MODULES.filter(
          (m) =>
            m.title.toLowerCase().includes(q) ||
            m.subtitle.toLowerCase().includes(q) ||
            m.shortLabel.toLowerCase().includes(q)
        )
      : EXPLORE_MODULES;

    return [...filtered].sort((a, b) => {
      const aPinned = pinnedSet.has(a.id) ? 0 : 1;
      const bPinned = pinnedSet.has(b.id) ? 0 : 1;
      return aPinned - bPinned;
    });
  }, [pinnedSet, searchQuery]);

  const activeBanner = HERO_BANNERS[bannerIndex];
  const activeComplaintsCount = complaints.filter((c) => c.status !== 'resolved').length;
  const resolvedComplaintsCount = complaints.filter((c) => c.status === 'resolved').length;
  const latestNews = news.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Top Grid: Hero Carousel + Desktop Quick Citizen Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Hero Banner Carousel */}
        <section className="lg:col-span-8 relative rounded-3xl overflow-hidden min-h-[220px] sm:min-h-[260px] flex flex-col justify-end p-5 sm:p-7 bg-slate-900">
          <img
            src={activeBanner.imageUrl}
            alt={activeBanner.title}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15" />

          <div className="relative z-10 max-w-xl">
            <p className="text-xs font-semibold text-white/85 tracking-wide">
              {activeBanner.kicker}
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-balance">
              {activeBanner.title}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-200 line-clamp-2">
              {activeBanner.subtitle}
            </p>
            <div className="mt-4 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => onSelectModule(activeBanner.targetModule)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs sm:text-sm font-semibold hover:opacity-95 transition-opacity min-h-[42px] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{activeBanner.ctaLabel}</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5" role="tablist" aria-label="Featured banners">
                {HERO_BANNERS.map((b, idx) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBannerIndex(idx)}
                    aria-label={`Show slide ${idx + 1}: ${b.title}`}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      idx === bannerIndex ? 'w-6 bg-white' : 'w-2 bg-white/45 hover:bg-white/75'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Citizen Quick Card & Civic Pulse (visible side-by-side on desktop, compact card on mobile) */}
        <aside className="lg:col-span-4 bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Welcome back, {profile.area}
                </p>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                  {profile.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={onOpenCitizenCard}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-semibold hover:opacity-90 transition-opacity min-h-[40px] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Citizen ID</span>
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-700/70">
              <div>
                <p className="text-lg font-bold font-mono-tabular text-slate-900 dark:text-white">
                  {activeComplaintsCount}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Active Issues</p>
              </div>
              <div>
                <p className="text-lg font-bold font-mono-tabular text-emerald-600 dark:text-emerald-400">
                  {resolvedComplaintsCount}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Resolved</p>
              </div>
              <div>
                <p className="text-lg font-bold font-mono-tabular text-[var(--accent)]">
                  {profile.points}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">WDM Points</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-slate-700/70">
            <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
              ID: {profile.citizenId}
            </span>
            <button
              type="button"
              onClick={() => onSelectModule('helpline')}
              className="font-semibold text-red-600 dark:text-red-400 hover:underline whitespace-nowrap cursor-pointer"
            >
              Emergency 112 / 108 →
            </button>
          </div>
        </aside>
      </div>

      {/* Explore Wyndhamganj 3-Column Grid (expands cleanly on desktop) */}
      <section>
        <div className="flex items-center justify-between gap-4 mb-3.5">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Explore Wyndhamganj
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {pinEditMode
                ? 'Tap any service to pin or unpin it to the top of your grid'
                : 'Local services, transport, civic portal, and town directories'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPinEditMode((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors min-h-[40px] whitespace-nowrap shrink-0 cursor-pointer ${
              pinEditMode
                ? 'bg-[var(--accent)] text-white'
                : 'bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
            <span>{pinEditMode ? 'Done Pinning' : 'Pin to Top'}</span>
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {sortedModules.map((mod) => {
            const Icon = MODULE_ICONS[mod.id];
            const isPinned = pinnedSet.has(mod.id);
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => (pinEditMode ? onTogglePin(mod.id) : onSelectModule(mod.id))}
                className={`group relative bg-white dark:bg-[#1E293B] border rounded-2xl p-3 sm:p-3.5 flex flex-col items-center text-center transition-all active:scale-[0.98] cursor-pointer ${
                  isPinned
                    ? 'border-[var(--accent)]/50'
                    : 'border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {isPinned && (
                  <span
                    className="absolute top-2 right-2 text-[var(--accent)]"
                    title="Pinned to top"
                  >
                    <Pin className="w-3 h-3 fill-current" />
                  </span>
                )}
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${mod.tintLight} ${mod.tintDark} flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform`}
                >
                  <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${mod.iconColor}`} />
                </div>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                  {mod.shortLabel}
                </span>
                <span className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 hidden sm:block">
                  {mod.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Latest Live News Preview Strip */}
      {latestNews.length > 0 && (
        <section>
          <div className="flex items-center justify-between gap-4 mb-3.5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Latest from Wyndhamganj Live
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Top headlines across Sonbhadra &amp; Wyndhamganj Block
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectModule('news')}
              className="text-xs font-semibold text-[var(--accent)] hover:underline min-h-[40px] px-2 flex items-center whitespace-nowrap cursor-pointer"
            >
              View All News →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {latestNews.map((article) => (
              <button
                key={article.id}
                type="button"
                onClick={() => onSelectModule('news')}
                className="text-left bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-700/80 rounded-2xl overflow-hidden hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex flex-col cursor-pointer"
              >
                <div className="relative aspect-[16/10] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {article.imageUrl ? (
                    <img
                      src={article.imageUrl}
                      alt={article.headline}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Newspaper className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                      <span className="font-semibold text-[var(--accent)]">{article.source}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatRelativeTime(article.createdAt)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">{formatViews(article.viewsCount)}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                      {article.headline}
                    </h3>
                  </div>
                  <p className="mt-2.5 text-xs font-semibold text-[var(--accent)]">
                    पूरी खबर पढ़ें →
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
