import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
  LayoutList,
  Map as MapIcon,
  MapPin,
  Plus,
  ThumbsUp,
  X,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  formatRelativeTime,
  VALIDATION,
  WYNDHAMGANJ_AREAS,
  type Complaint,
  type ComplaintCategory,
  type ComplaintStatus,
  type UserProfile,
} from '../types/wdm';
import { ComplaintLocationPicker, ComplaintsMap } from './ComplaintsMap';

interface ComplaintsViewProps {
  profile: UserProfile;
  isAdmin: boolean;
  complaints: Complaint[];
  onBack?: () => void;
}

const CATEGORIES: ComplaintCategory[] = [
  'बिजली समस्या',
  'पेयजल समस्या',
  'सफाई एवं कचरा',
  'सड़क समस्या',
  'स्वास्थ्य सेवा',
  'अन्य समस्या',
];

async function compressComplaintPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 180;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas error'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const out = canvas.toDataURL('image/jpeg', 0.48);
        resolve(out.length <= VALIDATION.PHOTO_URL_MAX ? out : '');
      };
      img.onerror = () => reject(new Error('Invalid image'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Read failed'));
    reader.readAsDataURL(file);
  });
}

export const ComplaintsView: React.FC<ComplaintsViewProps> = ({
  profile,
  isAdmin,
  complaints,
  onBack,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [viewMode, setViewMode] = useState<'both' | 'map' | 'list'>('both');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [supportedMap, setSupportedMap] = useState<Record<string, boolean>>({});
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const mapSectionRef = useRef<HTMLDivElement>(null);

  // Form state
  const [category, setCategory] = useState<ComplaintCategory>('बिजली समस्या');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState(profile.area || WYNDHAMGANJ_AREAS[0]);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [pinnedCoords, setPinnedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load user's existing support status per complaint
  useEffect(() => {
    let active = true;
    async function loadSupportFlags() {
      const entries: Record<string, boolean> = {};
      await Promise.all(
        complaints.map(async (c) => {
          try {
            const snap = await getDoc(doc(db, 'complaints', c.id, 'supporters', profile.uid));
            entries[c.id] = snap.exists();
          } catch {
            entries[c.id] = false;
          }
        })
      );
      if (active) setSupportedMap(entries);
    }
    if (complaints.length > 0) {
      loadSupportFlags();
    }
    return () => {
      active = false;
    };
  }, [complaints, profile.uid]);

  const filteredComplaints = useMemo(() => {
    if (filter === 'active') return complaints.filter((c) => c.status !== 'resolved');
    if (filter === 'resolved') return complaints.filter((c) => c.status === 'resolved');
    return complaints;
  }, [complaints, filter]);

  const handleToggleSupport = async (complaint: Complaint) => {
    if (complaint.status === 'resolved' || togglingId === complaint.id) return;
    setTogglingId(complaint.id);
    const alreadySupported = Boolean(supportedMap[complaint.id]);
    const compRef = doc(db, 'complaints', complaint.id);
    const suppRef = doc(db, 'complaints', complaint.id, 'supporters', profile.uid);

    try {
      const batch = writeBatch(db);
      if (alreadySupported) {
        batch.delete(suppRef);
        batch.update(compRef, {
          supporterCount: Math.max(0, complaint.supporterCount - 1),
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(suppRef, {
          userId: profile.uid,
          complaintId: complaint.id,
          createdAt: serverTimestamp(),
        });
        batch.update(compRef, {
          supporterCount: complaint.supporterCount + 1,
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      setSupportedMap((prev) => ({ ...prev, [complaint.id]: !alreadySupported }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `complaints/${complaint.id}`);
    } finally {
      setTogglingId(null);
    }
  };

  const handleAdminStatus = async (complaint: Complaint, nextStatus: ComplaintStatus) => {
    try {
      await updateDoc(doc(db, 'complaints', complaint.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `complaints/${complaint.id}`);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError('');
    try {
      const compressed = await compressComplaintPhoto(file);
      if (!compressed) {
        setFormError('Photo could not be compressed under limit. Try a smaller photo.');
        return;
      }
      setImageUrl(compressed);
    } catch {
      setFormError('Unable to read image file.');
    }
  };

  const handleFocusOnMap = (complaintId: string) => {
    setSelectedComplaintId(complaintId);
    if (viewMode === 'list') {
      setViewMode('both');
    }
    window.setTimeout(() => {
      mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const cleanTitle = title.trim().slice(0, VALIDATION.TITLE_MAX);
    const cleanLocation = location.trim().slice(0, VALIDATION.LOCATION_MAX);
    const cleanDesc = description.trim().slice(0, VALIDATION.DESC_MAX);

    if (cleanTitle.length < 4) {
      setFormError('कृपया कम से कम 4 अक्षरों का स्पष्ट शीर्षक लिखें।');
      return;
    }
    if (cleanDesc.length < 10) {
      setFormError('कृपया समस्या का पूरा विवरण (कम से कम 10 अक्षर) लिखें।');
      return;
    }

    setSubmitting(true);
    const newId = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    try {
      const payload: Record<string, unknown> = {
        id: newId,
        authorId: profile.uid,
        authorName: profile.name.slice(0, VALIDATION.NAME_MAX),
        category,
        status: 'submitted',
        title: cleanTitle,
        location: cleanLocation,
        description: cleanDesc,
        supporterCount: 0,
        visibility: 'public',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (imageUrl && imageUrl.length <= VALIDATION.PHOTO_URL_MAX) {
        payload.imageUrl = imageUrl;
      }
      if (
        pinnedCoords &&
        Number.isFinite(pinnedCoords.lat) &&
        Number.isFinite(pinnedCoords.lng) &&
        pinnedCoords.lat >= -90 &&
        pinnedCoords.lat <= 90 &&
        pinnedCoords.lng >= -180 &&
        pinnedCoords.lng <= 180
      ) {
        payload.latitude = Number(pinnedCoords.lat.toFixed(6));
        payload.longitude = Number(pinnedCoords.lng.toFixed(6));
      }
      await setDoc(doc(collection(db, 'complaints'), newId), payload);
      setTitle('');
      setDescription('');
      setImageUrl('');
      setPinnedCoords(null);
      setShowModal(false);
      setSelectedComplaintId(newId);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `complaints/${newId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Header & Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back to Home"
                className="mt-0.5 w-10 h-10 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                जनता की समस्याएं एवं समाधान पोर्टल
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Wyndhamganj Civic Complaints · Geolocation Map &amp; Public Grievance Portal
              </p>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 self-start">
            {(
              [
                { id: 'both', label: 'Map + List', Icon: MapIcon },
                { id: 'map', label: 'Map Only', Icon: MapPin },
                { id: 'list', label: 'List Only', Icon: LayoutList },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setViewMode(id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap min-h-[36px] cursor-pointer ${
                  viewMode === id
                    ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 self-start">
          {(
            [
              { id: 'all', label: `All (${complaints.length})` },
              {
                id: 'active',
                label: `Active (${complaints.filter((c) => c.status !== 'resolved').length})`,
              },
              {
                id: 'resolved',
                label: `Resolved (${complaints.filter((c) => c.status === 'resolved').length})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap min-h-[36px] cursor-pointer ${
                filter === tab.id
                  ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Geolocation Map Panel */}
      {viewMode !== 'list' && (
        <div ref={mapSectionRef}>
          <ComplaintsMap
            complaints={filteredComplaints}
            selectedComplaintId={selectedComplaintId}
            supportedMap={supportedMap}
            togglingId={togglingId}
            onSelectComplaint={setSelectedComplaintId}
            onToggleSupport={handleToggleSupport}
          />
        </div>
      )}

      {/* Complaint Cards Grid */}
      {viewMode !== 'map' && (
        <>
          {filteredComplaints.length === 0 ? (
            <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-2xl p-10 text-center">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                इस श्रेणी में अभी कोई शिकायत दर्ज नहीं है।
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Tap &ldquo;+ शिकायत दर्ज करें&rdquo; to report a civic issue in Wyndhamganj.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredComplaints.map((item) => {
                const isResolved = item.status === 'resolved';
                const isInProgress = item.status === 'in_progress';
                const supported = Boolean(supportedMap[item.id]);
                const isHighlighted = selectedComplaintId === item.id;
                const hasExactPin =
                  typeof item.latitude === 'number' && typeof item.longitude === 'number';

                return (
                  <article
                    key={item.id}
                    className={`bg-white dark:bg-[#1E293B] border rounded-2xl p-5 flex flex-col justify-between gap-4 transition-colors ${
                      isHighlighted
                        ? 'border-[var(--accent)] ring-2 ring-[var(--accent-ring)]'
                        : 'border-slate-200/80 dark:border-slate-700/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3 text-xs mb-2">
                        <span className="font-semibold text-[var(--accent)]">{item.category}</span>
                        <span
                          className={`font-semibold whitespace-nowrap ${
                            isResolved
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isInProgress
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          {isResolved
                            ? '• समाधान हुआ (Resolved)'
                            : isInProgress
                            ? '• प्रगति पर (In Progress)'
                            : '• दर्ज (Submitted)'}
                        </span>
                      </div>

                      <h2 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                        {item.title}
                      </h2>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          {item.location}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          {formatRelativeTime(item.createdAt)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>By {item.authorName}</span>
                        {hasExactPin && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-tabular">
                              {item.latitude!.toFixed(4)}, {item.longitude!.toFixed(4)}
                            </span>
                          </>
                        )}
                      </div>

                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {item.description}
                      </p>

                      {item.imageUrl && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-48">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-44 object-cover"
                          />
                        </div>
                      )}
                    </div>

                    <div className="pt-3.5 border-t border-slate-100 dark:border-slate-700/70 flex flex-wrap items-center justify-between gap-2.5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300 font-mono-tabular">
                        {item.supporterCount} लोगों ने समर्थन किया
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleFocusOnMap(item.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 min-h-[40px] whitespace-nowrap cursor-pointer"
                        >
                          <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
                          <span>View on Map</span>
                        </button>

                        {isAdmin && !isResolved && (
                          <button
                            type="button"
                            onClick={() => handleAdminStatus(item, 'resolved')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 min-h-[40px] whitespace-nowrap cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Resolved</span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isResolved || togglingId === item.id}
                          onClick={() => handleToggleSupport(item)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all min-h-[40px] whitespace-nowrap cursor-pointer disabled:opacity-50 ${
                            supported
                              ? 'bg-[var(--accent)] text-white'
                              : 'bg-[var(--accent-soft)] text-[var(--accent)] hover:opacity-90'
                          }`}
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${supported ? 'fill-current' : ''}`} />
                          <span>{supported ? 'समर्थन किया' : 'मैं भी प्रभावित हूँ'}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 lg:bottom-8 right-5 sm:right-8 z-30 inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-[var(--accent)] text-white font-semibold text-sm shadow-lg hover:opacity-95 active:scale-[0.98] transition-all min-h-[48px] cursor-pointer"
      >
        <Plus className="w-5 h-5" />
        <span>शिकायत दर्ज करें</span>
      </button>

      {/* New Complaint Bottom-Sheet Modal with Geolocation Map Picker */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full sm:max-w-lg bg-white dark:bg-[#1E293B] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 max-h-[92vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  नई शिकायत दर्ज करें
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pin exact location on Wyndhamganj map and submit your civic issue
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Close form"
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitComplaint} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  समस्या की श्रेणी (Category)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors min-h-[40px] cursor-pointer ${
                        category === cat
                          ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  शीर्षक (Title) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={VALIDATION.TITLE_MAX}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="जैसे: वार्ड 3 में स्ट्रीट लाइट खराब है"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  स्थान (Location in Wyndhamganj) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={VALIDATION.LOCATION_MAX}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Station Road, Mahuli, Ward 2..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                />
              </div>

              {/* Interactive Geolocation Pin Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  मैप पर स्थान पिन करें (Pin Issue Geolocation — Optional)
                </label>
                <ComplaintLocationPicker
                  selectedCoords={pinnedCoords}
                  onSelectCoords={(coords, suggestedLabel) => {
                    setPinnedCoords(coords);
                    if (suggestedLabel && !location.trim()) {
                      setLocation(suggestedLabel);
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  विस्तृत विवरण (Description) *
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={VALIDATION.DESC_MAX}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="समस्या कब से है और कितने लोग प्रभावित हैं..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                />
              </div>

              <div>
                <label className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer min-h-[42px]">
                  <Camera className="w-4 h-4 text-[var(--accent)]" />
                  <span>{imageUrl ? 'Photo Attached (Change)' : 'Attach Photo Evidence (Optional)'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="sr-only"
                  />
                </label>
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Complaint evidence preview"
                    className="mt-2 h-24 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                  />
                )}
              </div>

              {formError && (
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">{formError}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[48px] rounded-xl bg-[var(--accent)] text-white font-semibold text-sm hover:opacity-95 disabled:opacity-60 cursor-pointer"
              >
                {submitting ? 'दर्ज किया जा रहा है...' : 'शिकायत सबमिट करें (Submit Complaint)'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
