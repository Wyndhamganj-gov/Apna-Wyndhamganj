import React, { useState } from 'react';
import { type User } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  LogOut,
  MapPin,
  Phone,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import {
  db,
  handleFirestoreError,
  OperationType,
  signInWithGoogleAccount,
  signOutAccount,
} from '../lib/firebase';
import { APP_IMAGES } from '../data/seedData';
import { VALIDATION, WYNDHAMGANJ_AREAS } from '../types/wdm';

interface AuthGateProps {
  firebaseUser: User | null;
  needsOnboarding: boolean;
  onProfileCreated: () => void;
}

function generateCitizenId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `WDM-UP64-${suffix}`;
}

function generateReferralCode(name: string): string {
  const clean = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4) || 'WDMX';
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${clean}${num}`;
}

async function compressAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 96;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unavailable'));
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        resolve(dataUrl.length <= VALIDATION.PHOTO_URL_MAX ? dataUrl : '');
      };
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export const AuthGate: React.FC<AuthGateProps> = ({
  firebaseUser,
  needsOnboarding,
  onProfileCreated,
}) => {
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState('');

  // Onboarding state
  const [fullName, setFullName] = useState(firebaseUser?.displayName || '');
  const [mobile, setMobile] = useState('');
  const [area, setArea] = useState<string>(WYNDHAMGANJ_AREAS[0]);
  const [photoURL, setPhotoURL] = useState(firebaseUser?.photoURL || '');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  React.useEffect(() => {
    if (firebaseUser) {
      setFullName((prev) => prev || firebaseUser.displayName || '');
      setPhotoURL((prev) => prev || firebaseUser.photoURL || '');
    }
  }, [firebaseUser]);

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setSigningIn(true);
    try {
      await signInWithGoogleAccount();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to sign in right now.';
      const lower = msg.toLowerCase();
      if (
        !lower.includes('popup-closed-by-user') &&
        !lower.includes('cancel') &&
        !lower.includes('dismissed')
      ) {
        setAuthError(msg);
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError('');
    try {
      const compressed = await compressAvatarFile(file);
      if (!compressed) {
        setFormError('Selected photo is too large. Please pick a smaller image.');
        return;
      }
      setPhotoURL(compressed);
    } catch {
      setFormError('Could not process the selected image.');
    }
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setFormError('');

    const cleanName = fullName.trim().slice(0, VALIDATION.NAME_MAX);
    const cleanMobile = mobile.replace(/\D/g, '');
    const cleanArea = area.trim().slice(0, VALIDATION.AREA_MAX) || WYNDHAMGANJ_AREAS[0];

    if (cleanName.length < 2) {
      setFormError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!VALIDATION.MOBILE_REGEX.test(cleanMobile)) {
      setFormError('Please enter a valid 10-digit Indian mobile number starting with 6–9.');
      return;
    }

    setSubmitting(true);
    const citizenId = generateCitizenId();
    const referralCode = generateReferralCode(cleanName);
    const safePhoto =
      photoURL && photoURL.length <= VALIDATION.PHOTO_URL_MAX ? photoURL : '';
    const deviceInfo = (navigator.userAgent || 'WDM App').slice(0, 220);

    try {
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        uid: firebaseUser.uid,
        name: cleanName,
        mobileNumber: cleanMobile,
        area: cleanArea,
        citizenId,
        points: 0,
        photoURL: safePhoto,
        referralCode,
        referredBy: '',
        pinnedModules: ['complaints', 'news', 'transport'],
        blockedUserIds: [],
        themeMode: 'system',
        accentColor: 'default',
        deviceInfo,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      onProfileCreated();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${firebaseUser.uid}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0F172A] flex items-stretch justify-center">
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 min-h-screen">
        {/* Left Visual Story Panel (Desktop) / Top Banner (Mobile) */}
        <div className="relative lg:col-span-6 min-h-[260px] lg:min-h-screen overflow-hidden flex flex-col justify-end p-6 sm:p-10">
          <img
            src={APP_IMAGES.heroLandscape}
            alt="Wyndhamganj valley hills in Sonbhadra, Uttar Pradesh"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-slate-950/20" />
          <div className="relative z-10 max-w-lg">
            <div className="inline-flex items-center gap-2.5 mb-4">
              <img
                src="/assets/aistudio/Screenshot_2026-11-20_195741_c44a8c05.png"
                alt="WDM Wyndhamganj logo"
                className="w-11 h-11 rounded-xl object-cover shadow-lg bg-white"
              />
              <span className="text-sm font-semibold text-white/90 tracking-tight">
                Wyndhamganj, Sonbhadra · UP
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight text-balance">
              Wyndhamganj Wale
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-200 leading-relaxed">
              Your verified local citizen network for live Sonbhadra news, public grievances, WDM station schedules, creators, and community chat.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300">
              <span>Live Civic Portal</span>
              <span aria-hidden="true">·</span>
              <span>WDM Rail &amp; Bus Timings</span>
              <span aria-hidden="true">·</span>
              <span>Digital Citizen Card</span>
            </div>
          </div>
        </div>

        {/* Right Interactive Auth / Citizen Registration Panel */}
        <div className="lg:col-span-6 flex items-center justify-center p-6 sm:p-10 bg-[#F8F9FA] dark:bg-[#0F172A]">
          <div className="w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200/90 dark:border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-sm">
            {!firebaseUser || !needsOnboarding ? (
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)] mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verified Citizen Access Only</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Sign in to WDM
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  To protect community chats, civic complaints, and local directories, sign in with your verified Google account to continue.
                </p>

                {authError && (
                  <div className="mt-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
                    {authError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={signingIn}
                  className="mt-6 w-full min-h-[48px] px-5 py-3 rounded-xl bg-[var(--accent)] hover:opacity-95 text-white font-semibold text-sm flex items-center justify-center gap-3 shadow-sm transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M21.35 11.1h-9.18v2.98h5.27c-.23 1.48-1.71 4.34-5.27 4.34-3.17 0-5.76-2.63-5.76-5.87s2.59-5.87 5.76-5.87c1.81 0 3.02.77 3.71 1.44l2.53-2.44C16.79 4.16 14.69 3.25 12.17 3.25 7.1 3.25 3 7.35 3 12.55s4.1 9.3 9.17 9.3c5.29 0 8.8-3.72 8.8-8.97 0-.6-.06-1.06-.15-1.78z"
                    />
                  </svg>
                  <span>{signingIn ? 'Verifying account...' : 'Continue with Google'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700/80 space-y-2.5 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>Instant Wyndhamganj Digital Citizen Card (WDM-UP64) on onboarding.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>Your mobile number is stored privately and never shared publicly.</span>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCompleteOnboarding} className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[var(--accent)]">Step 2 of 2</p>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                      Citizen Registration
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => signOutAccount()}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 px-2.5 py-2 rounded-lg min-h-[40px]"
                    title="Switch account"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Switch</span>
                  </button>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Complete your Wyndhamganj profile to generate your unique Citizen Card ID and unlock all WDM services.
                </p>

                {/* Optional Profile Photo */}
                <div className="flex items-center gap-4 pt-1">
                  <div className="relative w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                    {photoURL ? (
                      <img
                        src={photoURL}
                        alt="Citizen avatar preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-7 h-7 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer min-h-[40px]">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Upload Photo (Optional)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="sr-only"
                      />
                    </label>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      Signed in as {firebaseUser.email}
                    </p>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      maxLength={VALIDATION.NAME_MAX}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g., Vivek Paswan"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] focus:border-[var(--accent)]"
                    />
                  </div>
                </div>

                {/* 10-Digit Indian Mobile Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                    10-Digit Indian Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-[var(--accent-ring)] focus-within:border-[var(--accent)] overflow-hidden">
                    <span className="px-3.5 py-3 text-sm font-mono-tabular font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                      +91
                    </span>
                    <Phone className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      required
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      className="w-full px-2.5 py-3 bg-transparent text-sm font-mono-tabular text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Village / Mohalla / Ward */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                    Village / Mohalla / Ward in Wyndhamganj
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] focus:border-[var(--accent)]"
                    >
                      {WYNDHAMGANJ_AREAS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {formError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-60 cursor-pointer"
                >
                  <span>{submitting ? 'Creating Citizen ID...' : 'Generate Citizen Card & Enter WDM'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
