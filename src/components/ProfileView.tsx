import React, { useState } from 'react';
import { deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import {
  Award,
  BadgeCheck,
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  Edit3,
  Gift,
  HelpCircle,
  Layers,
  LogOut,
  MessageCircle,
  Monitor,
  Moon,
  Palette,
  Printer,
  RefreshCw,
  Shield,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType, signOutAccount } from '../lib/firebase';
import {
  ACCENT_PRESETS,
  APP_VERSION,
  VALIDATION,
  WYNDHAMGANJ_AREAS,
  type AccentColor,
  type AppConfig,
  type Complaint,
  type CreatorProfile,
  type ExploreModuleId,
  type LocalListing,
  type ThemeMode,
  type UserProfile,
} from '../types/wdm';

interface ProfileViewProps {
  profile: UserProfile;
  userEmail: string;
  appConfig: AppConfig | null;
  myCreators: CreatorProfile[];
  myListings: LocalListing[];
  myComplaints: Complaint[];
  initialModal?: 'citizen_card' | null;
  onClearInitialModal?: () => void;
  onUpdateTheme: (mode: ThemeMode) => void;
  onUpdateAccent: (accent: AccentColor) => void;
  onOpenModule: (mod: ExploreModuleId) => void;
  onUnblockUser: (uid: string) => void;
}

type ActiveModal =
  | null
  | 'edit_profile'
  | 'citizen_card'
  | 'creator_studio'
  | 'refer_earn'
  | 'safety'
  | 'help'
  | 'updates';

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  userEmail,
  appConfig,
  myCreators,
  myListings,
  myComplaints,
  initialModal,
  onClearInitialModal,
  onUpdateTheme,
  onUpdateAccent,
  onOpenModule,
  onUnblockUser,
}) => {
  const [modal, setModal] = useState<ActiveModal>(initialModal || null);

  React.useEffect(() => {
    if (initialModal) {
      setModal(initialModal);
      onClearInitialModal?.();
    }
  }, [initialModal, onClearInitialModal]);

  // Edit profile state
  const [editName, setEditName] = useState(profile.name);
  const [editMobile, setEditMobile] = useState(profile.mobileNumber);
  const [editArea, setEditArea] = useState(profile.area);
  const [editError, setEditError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Refer & Earn state
  const [copiedCode, setCopiedCode] = useState(false);
  const [refInput, setRefInput] = useState('');
  const [refStatus, setRefStatus] = useState('');
  const [claimingRef, setClaimingRef] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    const cleanName = editName.trim().slice(0, VALIDATION.NAME_MAX);
    const cleanMobile = editMobile.replace(/\D/g, '');
    if (cleanName.length < 2) {
      setEditError('Name must be at least 2 characters.');
      return;
    }
    if (!VALIDATION.MOBILE_REGEX.test(cleanMobile)) {
      setEditError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setSavingProfile(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        name: cleanName,
        mobileNumber: cleanMobile,
        area: editArea.slice(0, VALIDATION.AREA_MAX),
        updatedAt: serverTimestamp(),
      });
      setModal(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleClaimReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    setRefStatus('');
    const code = refInput.trim().toUpperCase().slice(0, 24);
    if (code.length < 4) {
      setRefStatus('Please enter a valid referral code.');
      return;
    }
    if (code === profile.referralCode) {
      setRefStatus('You cannot claim your own referral code.');
      return;
    }
    if (profile.referredBy) {
      setRefStatus('You have already claimed your welcome referral bonus.');
      return;
    }
    setClaimingRef(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        referredBy: code,
        points: profile.points + 25,
        updatedAt: serverTimestamp(),
      });
      setRefInput('');
      setRefStatus('Success! +25 Wyndhamganj Community Points added to your Citizen account.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setClaimingRef(false);
    }
  };

  const handleDeleteOwned = async (colName: string, docId: string) => {
    try {
      await deleteDoc(doc(db, colName, docId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${colName}/${docId}`);
    }
  };

  const copyReferral = async () => {
    const code = profile.referralCode || profile.citizenId;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  const activeTheme = profile.themeMode || 'system';
  const activeAccent = profile.accentColor || 'default';

  return (
    <div className="space-y-5 pb-20">
      {/* User Identity Card */}
      <section className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-16 h-16 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] font-extrabold text-xl flex items-center justify-center overflow-hidden shrink-0">
              {profile.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={profile.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                profile.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                  {profile.name}
                </h1>
                <BadgeCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
              <p className="text-xs sm:text-sm font-mono-tabular text-slate-600 dark:text-slate-300">
                +91 {profile.mobileNumber}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {profile.area} · Verified Citizen ·{' '}
                <span className="font-mono-tabular font-semibold text-[var(--accent)]">
                  {profile.points} pts
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditName(profile.name);
                setEditMobile(profile.mobileNumber);
                setEditArea(profile.area);
                setModal('edit_profile');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[42px] cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
            <button
              type="button"
              onClick={() => signOutAccount()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-950 min-h-[42px] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Citizen Hub Menu List */}
        <section className="lg:col-span-7 bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-700/80 rounded-3xl divide-y divide-slate-100 dark:divide-slate-700/70 overflow-hidden">
          {[
            {
              icon: CreditCard,
              label: 'Wyndhamganj Citizen Card',
              sub: `Digital QR ID · ${profile.citizenId}`,
              onClick: () => setModal('citizen_card'),
            },
            {
              icon: Award,
              label: 'Influencer Meet Certificate',
              sub: 'Lookup & download verified event certificate',
              onClick: () => onOpenModule('influencer_meet'),
            },
            {
              icon: Layers,
              label: 'Creator Studio (My Adds)',
              sub: `${myCreators.length + myListings.length + myComplaints.length} submitted items`,
              onClick: () => setModal('creator_studio'),
            },
            {
              icon: MessageCircle,
              label: 'Wyndhamganj WhatsApp Group',
              sub: 'Official community invite channels',
              onClick: () => onOpenModule('whatsapp'),
            },
            {
              icon: Gift,
              label: 'Refer and Earn',
              sub: `Earn +25 Wyndhamganj Community Points · Code: ${profile.referralCode || profile.citizenId}`,
              onClick: () => setModal('refer_earn'),
            },
            {
              icon: Shield,
              label: 'Safety & Privacy',
              sub: `${(profile.blockedUserIds || []).length} blocked users · Private mobile protection`,
              onClick: () => setModal('safety'),
            },
            {
              icon: HelpCircle,
              label: 'Help & Admin Support',
              sub: 'FAQs & Wyndhamganj Wale Help Desk',
              onClick: () => setModal('help'),
            },
            {
              icon: RefreshCw,
              label: 'Check for Updates',
              sub: `Installed v${APP_VERSION} · Latest v${appConfig?.latestVersion || APP_VERSION}`,
              onClick: () => setModal('updates'),
            },
          ].map((row) => {
            const Icon = row.icon;
            return (
              <button
                key={row.label}
                type="button"
                onClick={row.onClick}
                className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors min-h-[64px] cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {row.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{row.sub}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            );
          })}
        </section>

        {/* Appearance Controls: Theme Mode + App Accent */}
        <section className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <Sun className="w-5 h-5 text-[var(--accent)]" />
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Theme Mode</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Switch cleanly between Light, Dark, and System
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'system', label: 'System', Icon: Monitor },
                  { id: 'light', label: 'Light', Icon: Sun },
                  { id: 'dark', label: 'Dark', Icon: Moon },
                ] as const
              ).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onUpdateTheme(id)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[44px] transition-colors cursor-pointer ${
                    activeTheme === id
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <Palette className="w-5 h-5 text-[var(--accent)]" />
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">App Accent</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Personalize buttons, navigation highlights &amp; Citizen Card
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ACCENT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onUpdateAccent(preset.id)}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 min-h-[44px] transition-colors cursor-pointer ${
                    activeAccent === preset.id
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-white"
                    style={{ backgroundColor: preset.swatch }}
                  >
                    {activeAccent === preset.id && <Check className="w-3 h-3" />}
                  </span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Modals */}
      {modal === 'citizen_card' && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Wyndhamganj Citizen Card
              </h2>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl p-5 text-white bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 border border-white/15 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src="/assets/aistudio/Screenshot_2026-11-20_195741_c44a8c05.png"
                    alt="WDM Wyndhamganj logo"
                    className="w-9 h-9 rounded-lg object-cover bg-white"
                  />
                  <div>
                    <p className="text-xs font-bold tracking-tight">Wyndhamganj Wale</p>
                    <p className="text-[10px] text-slate-300">Sonbhadra, Uttar Pradesh</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono-tabular text-emerald-400 font-semibold">
                  VERIFIED
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 pt-1">
                <div className="space-y-1.5 min-w-0">
                  <div>
                    <p className="text-[10px] text-slate-400">Citizen Name</p>
                    <p className="text-base font-bold truncate">{profile.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Mobile Number</p>
                    <p className="text-xs font-mono-tabular">+91 {profile.mobileNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Village / Ward</p>
                    <p className="text-xs truncate">{profile.area}</p>
                  </div>
                </div>
                <div className="p-2 bg-white rounded-xl shrink-0">
                  <QRCodeSVG
                    value={JSON.stringify({
                      id: profile.citizenId,
                      name: profile.name,
                      area: profile.area,
                      app: 'WDM-Wyndhamganj-Wale',
                    })}
                    size={88}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono-tabular text-slate-300">
                <span>ID: {profile.citizenId}</span>
                <span>PTS: {profile.points}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="w-full min-h-[46px] rounded-xl bg-[var(--accent)] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save Digital Card</span>
            </button>
          </div>
        </div>
      )}

      {modal === 'edit_profile' && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full sm:max-w-md bg-white dark:bg-[#1E293B] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit Profile</h2>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={VALIDATION.NAME_MAX}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  10-Digit Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono-tabular text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Village / Mohalla / Ward
                </label>
                <select
                  value={editArea}
                  onChange={(e) => setEditArea(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                >
                  {WYNDHAMGANJ_AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              {editError && <p className="text-xs text-red-600 dark:text-red-400">{editError}</p>}
              <button
                type="submit"
                disabled={savingProfile}
                className="w-full min-h-[46px] rounded-xl bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer"
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {modal === 'creator_studio' && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full sm:max-w-lg bg-white dark:bg-[#1E293B] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 max-h-[85vh] overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Creator Studio (My Adds)
              </h2>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {myCreators.length === 0 && myListings.length === 0 && myComplaints.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                You have not submitted any social accounts, shops, listings, or complaints yet.
              </p>
            ) : (
              <div className="space-y-4">
                {myCreators.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-500">Social Accounts</h3>
                    {myCreators.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {c.name} ({c.handle})
                          </p>
                          <p className="text-xs text-slate-500">
                            {c.platform} · Status: {c.approvalStatus}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteOwned('creators', c.id)}
                          aria-label="Delete creator submission"
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {myListings.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-500">Local Listings</h3>
                    {myListings.map((l) => (
                      <div
                        key={l.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {l.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {l.listingType} · {l.location}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteOwned('listings', l.id)}
                          aria-label="Delete listing"
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {myComplaints.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-500">My Filed Complaints</h3>
                    {myComplaints.map((comp) => (
                      <div
                        key={comp.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {comp.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {comp.category} · {comp.status}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteOwned('complaints', comp.id)}
                          aria-label="Delete complaint"
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {modal === 'refer_earn' && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Refer &amp; Earn</h2>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Share your Wyndhamganj Wale invite code with neighbors and earn community points for verified referrals.
            </p>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-500">Your Referral Code</p>
                <p className="text-lg font-extrabold font-mono-tabular text-[var(--accent)]">
                  {profile.referralCode || profile.citizenId}
                </p>
              </div>
              <button
                type="button"
                onClick={copyReferral}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold min-h-[40px] cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {!profile.referredBy ? (
              <form onSubmit={handleClaimReferral} className="space-y-2.5 pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Have a friend&rsquo;s invite code? Claim +25 Points
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={24}
                    value={refInput}
                    onChange={(e) => setRefInput(e.target.value.toUpperCase())}
                    placeholder="Enter code (e.g., WDM2026)"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono-tabular text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={claimingRef}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
                  >
                    Claim
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Welcome referral bonus claimed with code: {profile.referredBy}
              </p>
            )}
            {refStatus && <p className="text-xs text-[var(--accent)] font-medium">{refStatus}</p>}
          </div>
        </div>
      )}

      {modal === 'safety' && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Safety &amp; Privacy</h2>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Your registered mobile number (+91 {profile.mobileNumber}) and Google email ({userEmail}) are strictly isolated in Firestore and only readable by your account.
            </p>
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Muted / Blocked Chat Users ({(profile.blockedUserIds || []).length})
              </h3>
              {(profile.blockedUserIds || []).length === 0 ? (
                <p className="text-xs text-slate-500">No blocked users.</p>
              ) : (
                (profile.blockedUserIds || []).map((uid) => (
                  <div
                    key={uid}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs"
                  >
                    <span className="font-mono-tabular truncate">{uid}</span>
                    <button
                      type="button"
                      onClick={() => onUnblockUser(uid)}
                      className="text-[var(--accent)] font-semibold cursor-pointer"
                    >
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {modal === 'help' && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Help &amp; Wyndhamganj Desk
              </h2>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  How do civic complaints get resolved?
                </p>
                <p>
                  Submit your complaint with exact Ward/Mohalla details. Higher community support (&ldquo;मैं भी प्रभावित हूँ&rdquo;) prioritizes issues for local Escalation &amp; Admin resolution.
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  How do I get verified on Top Creators?
                </p>
                <p>
                  Add your YouTube, Instagram, or Facebook profile via &ldquo;+ Add your Social&rdquo;. Once reviewed by the Wyndhamganj Wale desk, your verified badge appears automatically.
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Admin Support Desk</p>
                <p>Wyndhamganj Bazar, Sonbhadra, Uttar Pradesh — 231226</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === 'updates' && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">App Updates</h2>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200">
              <p className="font-bold">WDM — Wyndhamganj Wale is up to date!</p>
              <p className="mt-1 font-mono-tabular">
                Version {appConfig?.latestVersion || APP_VERSION}
              </p>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {appConfig?.releaseNotes ||
                'Includes Wyndhamganj Citizen Card with scannable QR, real-time civic complaint upvoting, WDM Railway Station train schedules, and live local news.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
