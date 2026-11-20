import type { Timestamp } from 'firebase/firestore';

// Validation constants synchronized verbatim with firebase-blueprint.json
export const VALIDATION = {
  MOBILE_REGEX: /^[6-9][0-9]{9}$/,
  CITIZEN_ID_REGEX: /^WDM-[A-Z0-9-]+$/,
  CERT_CODE_REGEX: /^WDM-CERT-[A-Z0-9]+$/,
  ID_REGEX: /^[a-zA-Z0-9_-]+$/,
  NAME_MAX: 80,
  AREA_MAX: 80,
  TITLE_MAX: 140,
  LOCATION_MAX: 120,
  DESC_MAX: 1200,
  NEWS_HEADLINE_MAX: 220,
  NEWS_SUMMARY_MAX: 500,
  NEWS_BODY_MAX: 4000,
  CHAT_TEXT_MAX: 600,
  LISTING_DESC_MAX: 1000,
  PHOTO_URL_MAX: 2000,
} as const;

export const ADMIN_EMAIL = 'paswanvive@gmail.com';
export const APP_VERSION = '2.4.0';

export const WYNDHAMGANJ_AREAS = [
  'Wyndhamganj Bazar',
  'Station Road (WDM)',
  'Mahuli',
  'Dudhi Road',
  'Kon Road',
  'Salaiyadiah',
  'Kachanarwa',
  'Harnakachhar',
  'Rannu',
  'Phulwar',
  'Muirpur Road',
  'Ward 1 — Purani Bazar',
  'Ward 2 — Naya Mohalla',
  'Ward 3 — Railway Colony',
  'Ward 4 — Block Parisar',
  'Ward 5 — Subhash Nagar',
] as const;

export type ThemeMode = 'system' | 'light' | 'dark';
export type AccentColor = 'default' | 'purple' | 'emerald' | 'saffron' | 'royal' | 'rose' | 'teal';

export interface UserProfile {
  uid: string;
  name: string;
  mobileNumber: string;
  area: string;
  citizenId: string;
  points: number;
  photoURL?: string;
  referralCode?: string;
  referredBy?: string;
  pinnedModules?: string[];
  blockedUserIds?: string[];
  themeMode?: ThemeMode;
  accentColor?: AccentColor;
  deviceInfo?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ComplaintCategory =
  | 'बिजली समस्या'
  | 'पेयजल समस्या'
  | 'सफाई एवं कचरा'
  | 'सड़क समस्या'
  | 'स्वास्थ्य सेवा'
  | 'अन्य समस्या';

export type ComplaintStatus = 'submitted' | 'in_progress' | 'resolved';

export interface Complaint {
  id: string;
  authorId: string;
  authorName: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  title: string;
  location: string;
  description: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  supporterCount: number;
  visibility: 'public';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type NewsSource = 'Prabhat Khabar' | 'Hindustan' | 'Local Video' | 'Dainik Jagran' | 'WDM Desk';

export interface NewsArticle {
  id: string;
  articleNumber: number;
  source: NewsSource;
  headline: string;
  summary: string;
  body: string;
  location: string;
  imageUrl?: string;
  viewsCount: number;
  publishedDate: string;
  authorId: string;
  visibility: 'public';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CreatorPlatform = 'YouTube' | 'Instagram' | 'Facebook';

export interface CreatorProfile {
  id: string;
  ownerId: string;
  name: string;
  handle: string;
  platform: CreatorPlatform;
  followersCount: number;
  category: string;
  area: string;
  profileUrl?: string;
  verified: boolean;
  approvalStatus: 'approved' | 'pending';
  visibility: 'public';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'direct';
  participantIds: string[];
  visibility: 'public' | 'private';
  lastMessage?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderArea?: string;
  text: string;
  roomVisibility: 'public' | 'private';
  roomParticipants: string[];
  createdAt: Timestamp;
}

export type ListingType =
  | 'shop'
  | 'job'
  | 'room'
  | 'transport'
  | 'tourist'
  | 'festival'
  | 'event'
  | 'whatsapp'
  | 'helpline';

export interface LocalListing {
  id: string;
  ownerId: string;
  listingType: ListingType;
  title: string;
  subtitle?: string;
  category: string;
  location: string;
  contactPhone?: string;
  priceOrRate?: string;
  timing?: string;
  description: string;
  externalUrl?: string;
  imageUrl?: string;
  visibility: 'public';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface InfluencerCertificate {
  id: string;
  ownerId: string;
  participantName: string;
  handle: string;
  lookupKey: string;
  eventName: string;
  certificateCode: string;
  role: 'Creator' | 'Speaker' | 'Community Partner' | 'Attendee';
  issueDate: string;
  visibility: 'public';
  createdAt: Timestamp;
}

export interface AppConfig {
  id: string;
  latestVersion: string;
  releaseNotes?: string;
  announcement?: string;
  officialWhatsAppUrl?: string;
  visibility: 'public';
  updatedAt: Timestamp;
}

export type MainTab = 'home' | 'news' | 'chat' | 'profile';

export type ExploreModuleId =
  | 'influencer_meet'
  | 'creators'
  | 'whatsapp'
  | 'chat'
  | 'shop'
  | 'transport'
  | 'tourist'
  | 'news'
  | 'job'
  | 'festival'
  | 'event'
  | 'complaints'
  | 'room'
  | 'helpline';

export interface ExploreModuleMeta {
  id: ExploreModuleId;
  title: string;
  shortLabel: string;
  subtitle: string;
  tintLight: string;
  tintDark: string;
  iconColor: string;
}

export const EXPLORE_MODULES: ExploreModuleMeta[] = [
  {
    id: 'influencer_meet',
    title: 'Influencer Meet',
    shortLabel: 'Influencer Meet',
    subtitle: 'Events & Certificates',
    tintLight: 'bg-violet-50',
    tintDark: 'dark:bg-violet-950/50',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
  {
    id: 'creators',
    title: 'Wyndhamganj Creators',
    shortLabel: 'WDM Creators',
    subtitle: 'Top Leaderboard',
    tintLight: 'bg-fuchsia-50',
    tintDark: 'dark:bg-fuchsia-950/50',
    iconColor: 'text-fuchsia-600 dark:text-fuchsia-400',
  },
  {
    id: 'whatsapp',
    title: 'Wyndhamganj WhatsApp',
    shortLabel: 'WDM WhatsApp',
    subtitle: 'Community Groups',
    tintLight: 'bg-emerald-50',
    tintDark: 'dark:bg-emerald-950/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'chat',
    title: 'Wyndhamganj Chat',
    shortLabel: 'WDM Chat',
    subtitle: 'Live Local Rooms',
    tintLight: 'bg-sky-50',
    tintDark: 'dark:bg-sky-950/50',
    iconColor: 'text-sky-600 dark:text-sky-400',
  },
  {
    id: 'shop',
    title: 'Shop & Market',
    shortLabel: 'Shop & Market',
    subtitle: 'Bazar Rates & Shops',
    tintLight: 'bg-amber-50',
    tintDark: 'dark:bg-amber-950/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'transport',
    title: 'Bus & Train',
    shortLabel: 'Bus & Train',
    subtitle: 'WDM Station Timings',
    tintLight: 'bg-indigo-50',
    tintDark: 'dark:bg-indigo-950/50',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    id: 'tourist',
    title: 'Wyndhamganj Tourist',
    shortLabel: 'WDM Tourist',
    subtitle: 'Falls, Dams & Hills',
    tintLight: 'bg-teal-50',
    tintDark: 'dark:bg-teal-950/50',
    iconColor: 'text-teal-600 dark:text-teal-400',
  },
  {
    id: 'news',
    title: 'Wyndhamganj News',
    shortLabel: 'WDM News',
    subtitle: 'Live Sonbhadra Feed',
    tintLight: 'bg-rose-50',
    tintDark: 'dark:bg-rose-950/50',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  {
    id: 'job',
    title: 'Jobs & Labour',
    shortLabel: 'Jobs & Labour',
    subtitle: 'Local Hiring & Skills',
    tintLight: 'bg-blue-50',
    tintDark: 'dark:bg-blue-950/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    id: 'festival',
    title: 'Festival Vibe',
    shortLabel: 'Festival Vibe',
    subtitle: 'Puja & Cultural Updates',
    tintLight: 'bg-orange-50',
    tintDark: 'dark:bg-orange-950/50',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
  {
    id: 'event',
    title: 'Wyndhamganj Event',
    shortLabel: 'WDM Event',
    subtitle: 'Upcoming Programs',
    tintLight: 'bg-purple-50',
    tintDark: 'dark:bg-purple-950/50',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  {
    id: 'complaints',
    title: 'Wyndhamganj Complaints',
    shortLabel: 'Complaints',
    subtitle: 'जनता समाधान पोर्टल',
    tintLight: 'bg-red-50',
    tintDark: 'dark:bg-red-950/50',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  {
    id: 'room',
    title: 'PG / Room',
    shortLabel: 'PG / Room',
    subtitle: 'Rentals & Lodges',
    tintLight: 'bg-cyan-50',
    tintDark: 'dark:bg-cyan-950/50',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
  },
  {
    id: 'helpline',
    title: 'Helplines',
    shortLabel: 'Helplines',
    subtitle: '1-Tap Emergency Call',
    tintLight: 'bg-lime-50',
    tintDark: 'dark:bg-lime-950/50',
    iconColor: 'text-lime-700 dark:text-lime-400',
  },
];

export const ACCENT_PRESETS: { id: AccentColor; label: string; swatch: string }[] = [
  { id: 'default', label: 'WDM Default', swatch: '#6C2BD9' },
  { id: 'purple', label: 'Royal Violet', swatch: '#6C2BD9' },
  { id: 'emerald', label: 'Sonbhadra Emerald', swatch: '#10B981' },
  { id: 'saffron', label: 'Festival Saffron', swatch: '#EA580C' },
  { id: 'royal', label: 'Station Blue', swatch: '#2563EB' },
  { id: 'rose', label: 'Crimson News', swatch: '#E11D48' },
  { id: 'teal', label: 'Kaimur Teal', swatch: '#0D9488' },
];

export function formatFollowers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

export function formatViews(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M views`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k views`;
  return `${count} views`;
}

export function formatRelativeTime(ts?: Timestamp | null): string {
  if (!ts) return 'Just now';
  const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date();
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
