import React, { useMemo, useState } from 'react';
import { collection, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ExternalLink,
  Facebook,
  Instagram,
  Plus,
  Search,
  Trophy,
  X,
  Youtube,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { FALLBACK_VERIFIED_CREATORS } from '../data/seedData';
import {
  formatFollowers,
  VALIDATION,
  WYNDHAMGANJ_AREAS,
  type CreatorPlatform,
  type CreatorProfile,
  type UserProfile,
} from '../types/wdm';

interface CreatorsViewProps {
  profile: UserProfile;
  isAdmin: boolean;
  creators: CreatorProfile[];
  onBack?: () => void;
}

const PLATFORMS: ('All' | CreatorPlatform)[] = ['All', 'YouTube', 'Instagram', 'Facebook'];

function PlatformIcon({ platform, className = 'w-4 h-4' }: { platform: CreatorPlatform; className?: string }) {
  if (platform === 'YouTube') return <Youtube className={`${className} text-red-600 dark:text-red-400`} />;
  if (platform === 'Instagram') return <Instagram className={`${className} text-pink-600 dark:text-pink-400`} />;
  return <Facebook className={`${className} text-blue-600 dark:text-blue-400`} />;
}

export const CreatorsView: React.FC<CreatorsViewProps> = ({
  profile,
  isAdmin,
  creators,
  onBack,
}) => {
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState<'All' | CreatorPlatform>('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [formPlatform, setFormPlatform] = useState<CreatorPlatform>('YouTube');
  const [followers, setFollowers] = useState('');
  const [category, setCategory] = useState('Local Vlogs & Culture');
  const [area, setArea] = useState(profile.area || WYNDHAMGANJ_AREAS[0]);
  const [profileUrl, setProfileUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitNotice, setSubmitNotice] = useState('');

  // Merge live Firestore creators with curated Wyndhamganj directory defaults when DB has no approved entries yet
  const leaderboard = useMemo(() => {
    const approvedFirestore = creators.filter((c) => c.approvalStatus === 'approved');
    const baseList =
      approvedFirestore.length > 0
        ? approvedFirestore
        : (FALLBACK_VERIFIED_CREATORS as unknown as CreatorProfile[]);

    const q = search.trim().toLowerCase();
    return baseList
      .filter((c) => {
        if (platform !== 'All' && c.platform !== platform) return false;
        if (
          q &&
          !c.name.toLowerCase().includes(q) &&
          !c.handle.toLowerCase().includes(q) &&
          !c.area.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.followersCount - a.followersCount);
  }, [creators, platform, search]);

  const pendingSubmissions = useMemo(
    () =>
      creators.filter(
        (c) => c.approvalStatus === 'pending' && (isAdmin || c.ownerId === profile.uid)
      ),
    [creators, isAdmin, profile.uid]
  );

  const handleApprove = async (creator: CreatorProfile) => {
    try {
      await updateDoc(doc(db, 'creators', creator.id), {
        approvalStatus: 'approved',
        verified: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `creators/${creator.id}`);
    }
  };

  const handleSubmitCreator = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const cleanName = name.trim().slice(0, VALIDATION.NAME_MAX);
    const rawHandle = handle.trim().replace(/^@+/, '');
    const cleanHandle = rawHandle ? `@${rawHandle}`.slice(0, 60) : '';
    const count = Math.max(0, Math.min(100000000, Number(followers) || 0));

    if (cleanName.length < 2 || cleanHandle.length < 2) {
      setFormError('Please enter your creator name and social handle.');
      return;
    }

    setSubmitting(true);
    const newId = `cr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    try {
      await setDoc(doc(collection(db, 'creators'), newId), {
        id: newId,
        ownerId: profile.uid,
        name: cleanName,
        handle: cleanHandle,
        platform: formPlatform,
        followersCount: count,
        category: category.trim().slice(0, 50) || 'Community',
        area: area.trim().slice(0, 80) || WYNDHAMGANJ_AREAS[0],
        profileUrl: profileUrl.trim().slice(0, 500),
        verified: isAdmin,
        approvalStatus: isAdmin ? 'approved' : 'pending',
        visibility: 'public',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setName('');
      setHandle('');
      setFollowers('');
      setProfileUrl('');
      setShowAddModal(false);
      setSubmitNotice(
        isAdmin
          ? 'Creator profile added and published to the Wyndhamganj Leaderboard.'
          : 'Submitted for admin approval! You can track it anytime in Profile → Creator Studio.'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `creators/${newId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to Home"
              className="mt-0.5 w-10 h-10 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Wyndhamganj Top Creators
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Ranked directory of local YouTube, Instagram &amp; Facebook voices in Sonbhadra
            </p>
          </div>
        </div>
      </div>

      {submitNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-200">
          <span>{submitNotice}</span>
          <button type="button" onClick={() => setSubmitNotice('')} className="p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Platform Filters */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search creator by name, @handle, or area..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap min-h-[38px] cursor-pointer ${
                platform === p
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Pending Submissions Notice (for owner or admin) */}
      {pendingSubmissions.length > 0 && (
        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/70 rounded-2xl p-4 space-y-2.5">
          <h2 className="text-xs font-bold text-amber-800 dark:text-amber-300">
            {isAdmin ? 'Pending Admin Approval' : 'Your Pending Submissions'}
          </h2>
          {pendingSubmissions.map((cr) => (
            <div
              key={cr.id}
              className="flex items-center justify-between gap-3 bg-white dark:bg-[#1E293B] rounded-xl p-3 border border-amber-200/60 dark:border-slate-700"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {cr.name}{' '}
                  <span className="text-xs font-normal text-slate-500">{cr.handle}</span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {cr.platform} · {formatFollowers(cr.followersCount)} · Awaiting review
                </p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleApprove(cr)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold min-h-[36px] cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ranked Creator List */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-700/80 rounded-2xl divide-y divide-slate-100 dark:divide-slate-700/70 overflow-hidden">
        {leaderboard.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No creators found matching &ldquo;{search}&rdquo;.
          </div>
        ) : (
          leaderboard.map((creator, index) => {
            const rank = index + 1;
            const initials = creator.name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={creator.id}
                className="p-4 sm:px-5 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Rank Indicator */}
                  <div
                    className={`w-9 text-center font-mono-tabular font-extrabold text-sm shrink-0 ${
                      rank === 1
                        ? 'text-amber-500'
                        : rank === 2
                        ? 'text-slate-400'
                        : rank === 3
                        ? 'text-amber-700 dark:text-amber-500'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {rank === 1 ? (
                      <span className="inline-flex items-center justify-center gap-0.5">
                        <Trophy className="w-4 h-4" />1
                      </span>
                    ) : (
                      `#${rank}`
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] font-bold text-sm flex items-center justify-center shrink-0">
                    {initials}
                  </div>

                  {/* Identity */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                        {creator.name}
                      </h3>
                      {creator.verified && (
                        <BadgeCheck
                          className="w-4 h-4 text-[var(--accent)] shrink-0"
                          aria-label="Verified Creator"
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="truncate">{creator.handle}</span>
                      <span aria-hidden="true">·</span>
                      <span>{creator.area}</span>
                    </div>
                  </div>
                </div>

                {/* Followers & Platform */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold font-mono-tabular text-slate-900 dark:text-white">
                      {formatFollowers(creator.followersCount)}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {creator.platform === 'YouTube' ? 'Subscribers' : 'Followers'}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <PlatformIcon platform={creator.platform} />
                  </div>
                  {creator.profileUrl && (
                    <a
                      href={creator.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open ${creator.name} profile`}
                      className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-[var(--accent)]"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FAB: + Add your Social */}
      <button
        type="button"
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 lg:bottom-8 right-5 sm:right-8 z-30 inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-[var(--accent)] text-white font-semibold text-sm shadow-lg hover:opacity-95 active:scale-[0.98] transition-all min-h-[48px] cursor-pointer"
      >
        <Plus className="w-5 h-5" />
        <span>Add your Social</span>
      </button>

      {/* Add Creator Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full sm:max-w-lg bg-white dark:bg-[#1E293B] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Add your Social Profile
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Submit your YouTube, Instagram, or Facebook page to the Wyndhamganj Creators Directory
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreator} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-2">
                {(['YouTube', 'Instagram', 'Facebook'] as CreatorPlatform[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormPlatform(p)}
                    className={`py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 min-h-[42px] cursor-pointer ${
                      formPlatform === p
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>{p}</span>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Creator / Channel Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Sonbhadra Vlogs"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Handle (@username) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={60}
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="@wyndhamganj_star"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Followers / Subscribers *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={followers}
                    onChange={(e) => setFollowers(e.target.value)}
                    placeholder="5200"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono-tabular text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Area in Wyndhamganj
                  </label>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  >
                    {WYNDHAMGANJ_AREAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Profile Link (Optional)
                </label>
                <input
                  type="url"
                  maxLength={500}
                  value={profileUrl}
                  onChange={(e) => setProfileUrl(e.target.value)}
                  placeholder="https://youtube.com/@yourchannel"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>

              {formError && <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[48px] rounded-xl bg-[var(--accent)] text-white font-semibold text-sm hover:opacity-95 disabled:opacity-60 cursor-pointer"
              >
                {submitting ? 'Submitting...' : 'Submit for Leaderboard'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
