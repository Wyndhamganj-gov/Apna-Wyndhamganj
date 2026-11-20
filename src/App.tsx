import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  Bell,
  Home,
  MessageSquare,
  Newspaper,
  Search,
  Send,
  User as UserIcon,
  X,
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { seedCommunityDataIfEmpty } from './data/seedData';
import {
  ADMIN_EMAIL,
  type AccentColor,
  type AppConfig,
  type ChatRoom,
  type Complaint,
  type CreatorProfile,
  type ExploreModuleId,
  type InfluencerCertificate,
  type LocalListing,
  type MainTab,
  type NewsArticle,
  type ThemeMode,
  type UserProfile,
} from './types/wdm';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthGate } from './components/AuthGate';
import { HomeView } from './components/HomeView';
import { ComplaintsView } from './components/ComplaintsView';
import { NewsView } from './components/NewsView';
import { CreatorsView } from './components/CreatorsView';
import { ChatView } from './components/ChatView';
import { DirectoryModuleView } from './components/DirectoryModuleView';
import { ProfileView } from './components/ProfileView';

function WdmAppContent() {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Live Firestore collections
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [listings, setListings] = useState<LocalListing[]>([]);
  const [certificates, setCertificates] = useState<InfluencerCertificate[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [activeModule, setActiveModule] = useState<ExploreModuleId | null>(null);
  const [profileModalRequest, setProfileModalRequest] = useState<'citizen_card' | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotifs, setReadNotifs] = useState(false);
  const [unreadChat, setUnreadChat] = useState(true);
  const [shareToast, setShareToast] = useState('');
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  const isAdmin = Boolean(
    firebaseUser?.emailVerified && firebaseUser.email === ADMIN_EMAIL
  );

  // 1. Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (!user) {
        setProfile(null);
        setProfileLoading(false);
      } else {
        setProfileLoading(true);
      }
    });
    return () => unsub();
  }, []);

  // 2. Listen to users/{uid} when signed in
  useEffect(() => {
    if (!firebaseUser) return;
    const userRef = doc(db, 'users', firebaseUser.uid);
    const unsub = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        } else {
          setProfile(null);
        }
        setProfileLoading(false);
      },
      (error) => {
        setProfileLoading(false);
        handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
      }
    );
    return () => unsub();
  }, [firebaseUser]);

  // 3. Apply Light/Dark mode & App Accent to documentElement
  useEffect(() => {
    const themeMode: ThemeMode = profile?.themeMode || 'system';
    const accent: AccentColor = profile?.accentColor || 'default';
    const root = document.documentElement;

    const applyDark = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldDark = themeMode === 'dark' || (themeMode === 'system' && prefersDark);
      root.classList.toggle('dark', shouldDark);
    };
    applyDark();

    if (accent === 'default') {
      root.removeAttribute('data-accent');
    } else {
      root.setAttribute('data-accent', accent);
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (themeMode === 'system') applyDark();
    };
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [profile?.themeMode, profile?.accentColor]);

  // 4. Attach real-time Firestore listeners ONLY after Auth + Onboarding profile complete
  useEffect(() => {
    if (!firebaseUser || !profile) return;

    seedCommunityDataIfEmpty(firebaseUser.uid, firebaseUser.email);

    const unsubs: (() => void)[] = [];

    unsubs.push(
      onSnapshot(
        query(collection(db, 'complaints'), where('visibility', '==', 'public')),
        (snap) => {
          const items = snap.docs
            .map((d) => d.data() as Complaint)
            .sort((a, b) => (b.createdAt?.toMillis?.() ?? Date.now()) - (a.createdAt?.toMillis?.() ?? Date.now()));
          setComplaints(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'complaints')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'news'), where('visibility', '==', 'public')),
        (snap) => {
          const items = snap.docs
            .map((d) => d.data() as NewsArticle)
            .sort((a, b) => (b.createdAt?.toMillis?.() ?? Date.now()) - (a.createdAt?.toMillis?.() ?? Date.now()));
          setNews(items);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'news')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'creators'), where('visibility', '==', 'public')),
        (snap) => setCreators(snap.docs.map((d) => d.data() as CreatorProfile)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'creators')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'chats'), where('visibility', '==', 'public')),
        (snap) => setRooms(snap.docs.map((d) => d.data() as ChatRoom)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'chats')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'listings'), where('visibility', '==', 'public')),
        (snap) => setListings(snap.docs.map((d) => d.data() as LocalListing)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'listings')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'certificates'), where('visibility', '==', 'public')),
        (snap) => setCertificates(snap.docs.map((d) => d.data() as InfluencerCertificate)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'certificates')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'app_config'), where('visibility', '==', 'public')),
        (snap) => {
          const main = snap.docs.find((d) => d.id === 'main') || snap.docs[0];
          setAppConfig(main ? (main.data() as AppConfig) : null);
        },
        (err) => console.warn('App config read note:', err)
      )
    );

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [firebaseUser, profile]);

  const handleSelectModule = (moduleId: ExploreModuleId) => {
    setSearchOpen(false);
    setSearchQuery('');
    if (moduleId === 'news') {
      setActiveModule(null);
      setActiveTab('news');
      return;
    }
    if (moduleId === 'chat') {
      setActiveModule(null);
      setActiveTab('chat');
      setUnreadChat(false);
      return;
    }
    setActiveTab('home');
    setActiveModule(moduleId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabChange = (tab: MainTab) => {
    setActiveModule(null);
    setActiveTab(tab);
    if (tab === 'chat') setUnreadChat(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTogglePin = async (moduleId: ExploreModuleId) => {
    if (!profile) return;
    const current = profile.pinnedModules || [];
    const exists = current.includes(moduleId);
    const updated = exists
      ? current.filter((m) => m !== moduleId)
      : [moduleId, ...current].slice(0, 8);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        pinnedModules: updated,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const handleUpdateTheme = async (themeMode: ThemeMode) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        themeMode,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const handleUpdateAccent = async (accentColor: AccentColor) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        accentColor,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const handleBlockUser = async (targetUid: string) => {
    if (!profile || targetUid === profile.uid) return;
    const current = profile.blockedUserIds || [];
    if (current.includes(targetUid)) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        blockedUserIds: [...current, targetUid].slice(0, 50),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const handleUnblockUser = async (targetUid: string) => {
    if (!profile) return;
    const updated = (profile.blockedUserIds || []).filter((id) => id !== targetUid);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        blockedUserIds: updated,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const handleShareApp = async () => {
    const shareText = `Join WDM — Wyndhamganj Wale (Sonbhadra, UP) for Live News, Civic Complaints, WDM Train Schedules & Community Chat! Use invite code: ${
      profile?.referralCode || profile?.citizenId || 'WDM2026'
    }`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'WDM — Wyndhamganj Wale', text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        setShareToast('Invite link copied to clipboard!');
        window.setTimeout(() => setShareToast(''), 2500);
      }
    } catch {
      // User cancelled share
    }
  };

  const notifications = useMemo(() => {
    const items: { id: string; title: string; subtitle: string; target: ExploreModuleId }[] = [];
    if (appConfig?.announcement) {
      items.push({
        id: 'cfg_ann',
        title: 'Community Announcement',
        subtitle: appConfig.announcement,
        target: 'influencer_meet',
      });
    }
    if (news[0]) {
      items.push({
        id: `n_${news[0].id}`,
        title: `Breaking · ${news[0].source}`,
        subtitle: news[0].headline,
        target: 'news',
      });
    }
    if (complaints[0]) {
      items.push({
        id: `c_${complaints[0].id}`,
        title: `Civic Update · ${complaints[0].category}`,
        subtitle: complaints[0].title,
        target: 'complaints',
      });
    }
    return items;
  }, [appConfig, news, complaints]);

  // Loading Splash
  if (!authReady || profileLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0F172A] flex flex-col items-center justify-center p-6">
        <div className="w-14 h-14 rounded-2xl bg-[var(--accent)] text-white font-extrabold text-lg flex items-center justify-center shadow-lg">
          WDM
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Wyndhamganj Wale
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Verifying citizen session...
        </p>
      </div>
    );
  }

  // Strict Authentication & Mandatory Citizen Registration Gate
  if (!firebaseUser || !profile) {
    return (
      <AuthGate
        firebaseUser={firebaseUser}
        needsOnboarding={Boolean(firebaseUser && !profile)}
        onProfileCreated={() => {
          // Real-time onSnapshot listener on users/{uid} updates profile automatically
        }}
      />
    );
  }

  const myCreators = creators.filter((c) => c.ownerId === profile.uid);
  const myListings = listings.filter((l) => l.ownerId === profile.uid);
  const myComplaints = complaints.filter((c) => c.authorId === profile.uid);

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0F172A] text-slate-900 dark:text-slate-100">
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Compact Sticky Top App Bar */}
      <header className="sticky top-0 z-30 h-14 sm:h-16 bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Brand Logo + Title */}
          <button
            type="button"
            onClick={() => handleTabChange('home')}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="w-9 h-9 rounded-xl bg-[var(--accent)] text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
              WDM
            </span>
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
              Wyndhamganj Wale
            </span>
          </button>

          {/* Desktop Inline Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold">
            {(
              [
                { id: 'home', label: 'Home' },
                { id: 'news', label: 'News' },
                { id: 'chat', label: 'Chat' },
                { id: 'profile', label: 'Profile' },
              ] as const
            ).map((item) => {
              const isActive = activeTab === item.id && !activeModule;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabChange(item.id)}
                  className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isActive
                      ? 'text-[var(--accent)]'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                  {item.id === 'chat' && unreadChat && (
                    <span
                      className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-red-500 align-top"
                      aria-label="Unread messages"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons: Search, Notification Bell, Share/DM */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSearchOpen((v) => !v);
                if (activeTab !== 'home' || activeModule) {
                  setActiveModule(null);
                  setActiveTab('home');
                }
              }}
              aria-label="Search Wyndhamganj services"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((v) => !v);
                setReadNotifs(true);
              }}
              aria-label="Notifications"
              className="relative w-10 h-10 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {!readNotifs && notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold font-mono-tabular flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleShareApp}
              aria-label="Share WDM Wyndhamganj Wale"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Expandable Search Strip */}
      {searchOpen && (
        <div className="bg-white dark:bg-[#1E293B] border-b border-slate-200 dark:border-slate-800 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Explore Wyndhamganj (Bus & Train, Complaints, Shop, Helplines...)"
              className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchOpen(false);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Share Confirmation Toast */}
      {shareToast && (
        <div className="fixed top-16 right-4 z-50 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-lg">
          {shareToast}
        </div>
      )}

      {/* Notifications Popover */}
      {notificationsOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/25"
          onClick={() => setNotificationsOpen(false)}
        >
          <div
            className="max-w-md w-[calc(100%-2rem)] mx-auto mt-16 sm:mr-6 sm:ml-auto bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Wyndhamganj Alerts
              </h2>
              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                className="p-1 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/70">
              {notifications.length === 0 ? (
                <p className="p-5 text-xs text-slate-500 text-center">All caught up!</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      setNotificationsOpen(false);
                      handleSelectModule(n.target);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <p className="text-xs font-semibold text-[var(--accent)]">{n.title}</p>
                    <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-200 line-clamp-2">
                      {n.subtitle}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-24 lg:pb-10">
        {activeModule === 'complaints' ? (
          <ComplaintsView
            profile={profile}
            isAdmin={isAdmin}
            complaints={complaints}
            onBack={() => setActiveModule(null)}
          />
        ) : activeModule === 'creators' ? (
          <CreatorsView
            profile={profile}
            isAdmin={isAdmin}
            creators={creators}
            onBack={() => setActiveModule(null)}
          />
        ) : activeModule ? (
          <DirectoryModuleView
            moduleId={activeModule}
            profile={profile}
            listings={listings}
            certificates={certificates}
            onBack={() => setActiveModule(null)}
          />
        ) : activeTab === 'home' ? (
          <HomeView
            profile={profile}
            news={news}
            complaints={complaints}
            searchQuery={searchQuery}
            onSelectModule={handleSelectModule}
            onTogglePin={handleTogglePin}
            onOpenCitizenCard={() => {
              setProfileModalRequest('citizen_card');
              setActiveTab('profile');
            }}
          />
        ) : activeTab === 'news' ? (
          <NewsView profile={profile} articles={news} />
        ) : activeTab === 'chat' ? (
          <ChatView profile={profile} rooms={rooms} onBlockUser={handleBlockUser} />
        ) : (
          <ProfileView
            profile={profile}
            userEmail={firebaseUser.email || ''}
            appConfig={appConfig}
            myCreators={myCreators}
            myListings={myListings}
            myComplaints={myComplaints}
            initialModal={profileModalRequest}
            onClearInitialModal={() => setProfileModalRequest(null)}
            onUpdateTheme={handleUpdateTheme}
            onUpdateAccent={handleUpdateAccent}
            onOpenModule={handleSelectModule}
            onUnblockUser={handleUnblockUser}
          />
        )}
      </main>

      {/* Bottom Floating Navigation Bar (Mobile & Tablet — Pill-shaped Active Indicator) */}
      <nav
        aria-label="Primary navigation"
        className="lg:hidden fixed bottom-3 left-3 right-3 z-30 max-w-md mx-auto bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/80 rounded-2xl shadow-lg px-2 py-1.5"
      >
        <div className="grid grid-cols-4 items-center gap-1">
          {(
            [
              { id: 'home', label: 'Home', Icon: Home },
              { id: 'news', label: 'News', Icon: Newspaper },
              { id: 'chat', label: 'Chat', Icon: MessageSquare },
              { id: 'profile', label: 'Profile', Icon: UserIcon },
            ] as const
          ).map(({ id, label, Icon }) => {
            const isActive = activeTab === id && !activeModule;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleTabChange(id)}
                className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl min-h-[46px] transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {id === 'chat' && unreadChat && (
                    <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-red-500" />
                  )}
                </div>
                <span className="text-[11px] font-semibold mt-0.5 leading-none">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <WdmAppContent />
    </ErrorBoundary>
  );
}
