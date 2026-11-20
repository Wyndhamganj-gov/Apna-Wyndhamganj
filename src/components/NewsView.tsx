import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import {
  Calendar,
  Eye,
  MapPin,
  Newspaper,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { APP_IMAGES } from '../data/seedData';
import {
  formatRelativeTime,
  formatViews,
  VALIDATION,
  type NewsArticle,
  type NewsSource,
  type UserProfile,
} from '../types/wdm';

interface NewsViewProps {
  profile: UserProfile;
  articles: NewsArticle[];
}

const SOURCES: ('All' | NewsSource)[] = [
  'All',
  'Prabhat Khabar',
  'Hindustan',
  'Local Video',
  'Dainik Jagran',
  'WDM Desk',
];

function getTodayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

export const NewsView: React.FC<NewsViewProps> = ({ profile, articles }) => {
  const [now, setNow] = useState(() => new Date());
  const [selectedSource, setSelectedSource] = useState<'All' | NewsSource>('All');
  const [onlyToday, setOnlyToday] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeArticle, setActiveArticle] = useState<NewsArticle | null>(null);

  // Publish news modal
  const [showPublish, setShowPublish] = useState(false);
  const [pubSource, setPubSource] = useState<NewsSource>('WDM Desk');
  const [pubHeadline, setPubHeadline] = useState('');
  const [pubSummary, setPubSummary] = useState('');
  const [pubBody, setPubBody] = useState('');
  const [pubLocation, setPubLocation] = useState('Wyndhamganj, Sonbhadra');
  const [pubSubmitting, setPubSubmitting] = useState(false);
  const [pubError, setPubError] = useState('');

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const formattedClock = useMemo(() => {
    const time = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    const date = now.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    return `${time.toUpperCase()} | ${date}`;
  }, [now]);

  const filteredArticles = useMemo(() => {
    const todayIso = getTodayIso();
    const q = queryText.trim().toLowerCase();
    return articles.filter((a) => {
      if (selectedSource !== 'All' && a.source !== selectedSource) return false;
      if (onlyToday && a.publishedDate !== todayIso) return false;
      if (selectedDate && a.publishedDate !== selectedDate) return false;
      if (
        q &&
        !a.headline.toLowerCase().includes(q) &&
        !a.summary.toLowerCase().includes(q) &&
        !a.location.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [articles, selectedSource, onlyToday, selectedDate, queryText]);

  const handleOpenArticle = async (article: NewsArticle) => {
    setActiveArticle(article);
    try {
      await updateDoc(doc(db, 'news', article.id), {
        viewsCount: article.viewsCount + 1,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      // Non-blocking for reader UX while still logging structured context
      console.warn('View count update skipped:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setNow(new Date());
    window.setTimeout(() => setRefreshing(false), 500);
  };

  const handlePublishNews = async (e: React.FormEvent) => {
    e.preventDefault();
    setPubError('');
    const h = pubHeadline.trim().slice(0, VALIDATION.NEWS_HEADLINE_MAX);
    const s = pubSummary.trim().slice(0, VALIDATION.NEWS_SUMMARY_MAX);
    const b = pubBody.trim().slice(0, VALIDATION.NEWS_BODY_MAX);
    const loc = pubLocation.trim().slice(0, 100) || 'Wyndhamganj, Sonbhadra';

    if (h.length < 5 || s.length < 10 || b.length < 20) {
      setPubError('Please provide a headline (5+ chars), summary (10+ chars), and story body (20+ chars).');
      return;
    }

    setPubSubmitting(true);
    const nextNumber =
      articles.reduce((max, item) => Math.max(max, item.articleNumber || 100), 100) + 1;
    const newId = `news_${Date.now()}`;
    try {
      await setDoc(doc(collection(db, 'news'), newId), {
        id: newId,
        articleNumber: nextNumber,
        source: pubSource,
        headline: h,
        summary: s,
        body: b,
        location: loc,
        imageUrl: APP_IMAGES.heroLandscape,
        viewsCount: 1,
        publishedDate: getTodayIso(),
        authorId: profile.uid,
        visibility: 'public',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setPubHeadline('');
      setPubSummary('');
      setPubBody('');
      setShowPublish(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `news/${newId}`);
    } finally {
      setPubSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Live News Header with Real-Time Clock */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Wyndhamganj Live News
            </h1>
            <p className="mt-1 text-xs font-mono-tabular font-semibold text-[var(--accent)]">
              {formattedClock}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search news"
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              aria-label="Refresh feed"
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setShowPublish(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold min-h-[40px] whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Post News</span>
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/70">
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search Wyndhamganj headlines, railway, bazar, Sonbhadra..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
          </div>
        )}

        {/* Source Filter Tabs + Date Filter */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {SOURCES.map((source) => (
              <button
                key={source}
                type="button"
                onClick={() => setSelectedSource(source)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[38px] cursor-pointer ${
                  selectedSource === source
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                }`}
              >
                {source}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setOnlyToday((v) => !v);
                setSelectedDate('');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors min-h-[38px] whitespace-nowrap cursor-pointer ${
                onlyToday
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              Today
            </button>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 min-h-[38px]">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setOnlyToday(false);
                }}
                aria-label="Filter by date"
                className="bg-transparent text-xs focus:outline-none font-mono-tabular"
              />
            </label>
          </div>
        </div>
      </div>

      {/* News Feed Cards */}
      {filteredArticles.length === 0 ? (
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-2xl p-10 text-center">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            No matching news articles found for this filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedSource('All');
              setOnlyToday(false);
              setSelectedDate('');
              setQueryText('');
            }}
            className="mt-3 text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer"
          >
            Reset News Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredArticles.map((article) => (
            <article
              key={article.id}
              className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-700/80 rounded-2xl overflow-hidden flex flex-col justify-between"
            >
              <div>
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
                      <Newspaper className="w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25" />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-white text-xs font-mono-tabular font-semibold">
                    #{article.articleNumber}
                  </span>
                  <span className="absolute bottom-3 left-3 text-xs font-semibold text-white">
                    {article.source}
                  </span>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <span>{formatRelativeTime(article.createdAt)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {article.location}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 font-mono-tabular">
                      <Eye className="w-3 h-3" />
                      {formatViews(article.viewsCount)}
                    </span>
                  </div>

                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    {article.headline}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                    {article.summary}
                  </p>
                </div>
              </div>

              <div className="px-4 sm:px-5 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700/70 flex items-center justify-between">
                <span className="text-xs font-mono-tabular text-slate-400">
                  {article.publishedDate}
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenArticle(article)}
                  className="text-xs sm:text-sm font-semibold text-[var(--accent)] hover:underline min-h-[40px] flex items-center cursor-pointer"
                >
                  पूरी खबर पढ़ें →
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Full Story Reader Modal */}
      {activeArticle && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setActiveArticle(null)}
        >
          <div
            className="w-full sm:max-w-2xl bg-white dark:bg-[#1E293B] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {activeArticle.imageUrl && (
              <div className="relative h-56 sm:h-72 w-full">
                <img
                  src={activeArticle.imageUrl}
                  alt={activeArticle.headline}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setActiveArticle(null)}
                  aria-label="Close story"
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/65 text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                <span className="font-semibold text-[var(--accent)]">{activeArticle.source}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">#{activeArticle.articleNumber}</span>
                <span aria-hidden="true">·</span>
                <span>{activeArticle.location}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">{formatViews(activeArticle.viewsCount + 1)}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-snug">
                {activeArticle.headline}
              </h2>
              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                {activeArticle.summary}
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {activeArticle.body}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Local News Modal */}
      {showPublish && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowPublish(false)}
        >
          <div
            className="w-full sm:max-w-lg bg-white dark:bg-[#1E293B] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Publish Wyndhamganj Local Story
              </h2>
              <button
                type="button"
                onClick={() => setShowPublish(false)}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePublishNews} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Source / Channel
                </label>
                <select
                  value={pubSource}
                  onChange={(e) => setPubSource(e.target.value as NewsSource)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                >
                  {SOURCES.filter((s) => s !== 'All').map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Headline *
                </label>
                <input
                  type="text"
                  required
                  maxLength={VALIDATION.NEWS_HEADLINE_MAX}
                  value={pubHeadline}
                  onChange={(e) => setPubHeadline(e.target.value)}
                  placeholder="Enter local headline in Hindi or English"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={pubLocation}
                  onChange={(e) => setPubLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Short Summary *
                </label>
                <textarea
                  required
                  rows={2}
                  maxLength={VALIDATION.NEWS_SUMMARY_MAX}
                  value={pubSummary}
                  onChange={(e) => setPubSummary(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Full Story *
                </label>
                <textarea
                  required
                  rows={4}
                  maxLength={VALIDATION.NEWS_BODY_MAX}
                  value={pubBody}
                  onChange={(e) => setPubBody(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>
              {pubError && <p className="text-xs text-red-600 dark:text-red-400">{pubError}</p>}
              <button
                type="submit"
                disabled={pubSubmitting}
                className="w-full min-h-[46px] rounded-xl bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
              >
                {pubSubmitting ? 'Publishing...' : 'Publish to Wyndhamganj Live'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
