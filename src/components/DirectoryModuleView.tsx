import React, { useMemo, useState } from 'react';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  Award,
  Clock,
  ExternalLink,
  MapPin,
  PhoneCall,
  Plus,
  Printer,
  Search,
  Train,
  X,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  EXPLORE_MODULES,
  VALIDATION,
  WYNDHAMGANJ_AREAS,
  type ExploreModuleId,
  type InfluencerCertificate,
  type ListingType,
  type LocalListing,
  type UserProfile,
} from '../types/wdm';

interface DirectoryModuleViewProps {
  moduleId: ExploreModuleId;
  profile: UserProfile;
  listings: LocalListing[];
  certificates: InfluencerCertificate[];
  onBack: () => void;
}

const ADDABLE_TYPES: ListingType[] = ['shop', 'job', 'room', 'event', 'festival'];

export const DirectoryModuleView: React.FC<DirectoryModuleViewProps> = ({
  moduleId,
  profile,
  listings,
  certificates,
  onBack,
}) => {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  // Listing submission form
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState(profile.area || WYNDHAMGANJ_AREAS[0]);
  const [contactPhone, setContactPhone] = useState(profile.mobileNumber || '');
  const [priceOrRate, setPriceOrRate] = useState('');
  const [timing, setTiming] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Influencer Meet Certificate lookup & registration
  const [certQuery, setCertQuery] = useState('');
  const [regHandle, setRegHandle] = useState('');
  const [regRole, setRegRole] = useState<'Creator' | 'Speaker' | 'Community Partner' | 'Attendee'>(
    'Creator'
  );
  const [registering, setRegistering] = useState(false);
  const [activeCert, setActiveCert] = useState<InfluencerCertificate | null>(null);

  const meta = EXPLORE_MODULES.find((m) => m.id === moduleId);
  const isInfluencerMeet = moduleId === 'influencer_meet';
  const listingType = moduleId as ListingType;
  const canAddListing = ADDABLE_TYPES.includes(listingType);

  const filteredListings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return listings.filter((item) => {
      if (item.listingType !== listingType) return false;
      if (
        q &&
        !item.title.toLowerCase().includes(q) &&
        !(item.subtitle || '').toLowerCase().includes(q) &&
        !item.location.toLowerCase().includes(q) &&
        !item.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [listings, listingType, search]);

  const filteredCertificates = useMemo(() => {
    const q = certQuery.trim().toLowerCase();
    if (!q) return certificates;
    return certificates.filter(
      (c) =>
        c.participantName.toLowerCase().includes(q) ||
        c.handle.toLowerCase().includes(q) ||
        c.certificateCode.toLowerCase().includes(q) ||
        c.lookupKey.toLowerCase().includes(q)
    );
  }, [certificates, certQuery]);

  const handleRegisterInfluencerMeet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registering) return;
    setRegistering(true);
    const cleanHandle = regHandle.trim()
      ? regHandle.trim().startsWith('@')
        ? regHandle.trim()
        : `@${regHandle.trim()}`
      : `@${profile.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'wdmcitizen'}`;
    const code = `WDM-CERT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const certId = `cert_${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);

    try {
      const certPayload = {
        id: certId,
        ownerId: profile.uid,
        participantName: profile.name.slice(0, 80),
        handle: cleanHandle.slice(0, 60),
        lookupKey: `${profile.name.toLowerCase()} ${cleanHandle.toLowerCase()} ${profile.citizenId.toLowerCase()}`.slice(
          0,
          80
        ),
        eventName: 'Wyndhamganj Influencer Meet 2026',
        certificateCode: code,
        role: regRole,
        issueDate: today,
        visibility: 'public' as const,
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(collection(db, 'certificates'), certId), certPayload);
      setRegHandle('');
      setActiveCert(certPayload as unknown as InfluencerCertificate);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `certificates/${certId}`);
    } finally {
      setRegistering(false);
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 2 || description.trim().length < 5) return;
    setSubmitting(true);
    const newId = `lst_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    try {
      await setDoc(doc(collection(db, 'listings'), newId), {
        id: newId,
        ownerId: profile.uid,
        listingType,
        title: title.trim().slice(0, VALIDATION.TITLE_MAX),
        subtitle: subtitle.trim().slice(0, 160),
        category: category.trim().slice(0, 60) || meta?.shortLabel || 'Local',
        location: location.trim().slice(0, VALIDATION.LOCATION_MAX),
        contactPhone: contactPhone.trim().slice(0, 20),
        priceOrRate: priceOrRate.trim().slice(0, 80),
        timing: timing.trim().slice(0, 100),
        description: description.trim().slice(0, VALIDATION.LISTING_DESC_MAX),
        visibility: 'public',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setTitle('');
      setSubtitle('');
      setPriceOrRate('');
      setTiming('');
      setDescription('');
      setShowAdd(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `listings/${newId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="mt-0.5 w-10 h-10 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {meta?.title || 'Wyndhamganj Directory'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {meta?.subtitle || 'Verified local listings in Wyndhamganj, Sonbhadra'}
            </p>
          </div>
        </div>

        {canAddListing && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold min-h-[42px] whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add {meta?.shortLabel}</span>
          </button>
        )}
      </div>

      {/* Special Module: Influencer Meet & Digital Certificate Lookup */}
      {isInfluencerMeet ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Registration Card */}
          <div className="lg:col-span-5 bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Wyndhamganj Influencer Meet 2026
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Register &amp; issue your instant verified digital certificate
                </p>
              </div>
            </div>

            <form onSubmit={handleRegisterInfluencerMeet} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Participant Name
                </label>
                <input
                  type="text"
                  disabled
                  value={profile.name}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Social Handle / Channel Username
                </label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={regHandle}
                  onChange={(e) => setRegHandle(e.target.value)}
                  placeholder="@wyndhamganj_creator"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Participation Role
                </label>
                <select
                  value={regRole}
                  onChange={(e) =>
                    setRegRole(
                      e.target.value as 'Creator' | 'Speaker' | 'Community Partner' | 'Attendee'
                    )
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                >
                  <option value="Creator">Creator</option>
                  <option value="Speaker">Speaker</option>
                  <option value="Community Partner">Community Partner</option>
                  <option value="Attendee">Attendee</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={registering}
                className="w-full min-h-[46px] rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60 cursor-pointer"
              >
                {registering ? 'Generating Certificate...' : 'Register & Generate Certificate'}
              </button>
            </form>
          </div>

          {/* Digital Certificate Lookup */}
          <div className="lg:col-span-7 bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Digital Certificate Lookup
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Search by Name, @username, Citizen ID, or Certificate Code (WDM-CERT-...)
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={certQuery}
                onChange={(e) => setCertQuery(e.target.value)}
                placeholder="Search @handle, name, or WDM-CERT-..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
              />
            </div>

            {filteredCertificates.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No certificates found yet. Register on the left to generate your verified Wyndhamganj Influencer Meet certificate!
              </p>
            ) : (
              <div className="space-y-2.5">
                {filteredCertificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {cert.participantName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {cert.handle} · {cert.role} ·{' '}
                        <span className="font-mono-tabular">{cert.certificateCode}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveCert(cert)}
                      className="px-3.5 py-2 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-semibold min-h-[38px] whitespace-nowrap cursor-pointer"
                    >
                      View / Print
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${meta?.title || 'listings'} in Wyndhamganj...`}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
          </div>

          {/* Listing Cards */}
          {filteredListings.length === 0 ? (
            <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-2xl p-10 text-center">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                No entries listed yet in {meta?.title}.
              </p>
              {canAddListing && (
                <button
                  type="button"
                  onClick={() => setShowAdd(true)}
                  className="mt-3 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold cursor-pointer"
                >
                  Be the first to add one
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredListings.map((item) => (
                <article
                  key={item.id}
                  className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-700/80 rounded-2xl overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {item.imageUrl && (
                      <div className="h-44 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                        <span className="font-semibold text-[var(--accent)]">{item.category}</span>
                        {item.priceOrRate && (
                          <span className="font-mono-tabular font-semibold text-slate-700 dark:text-slate-200">
                            {item.priceOrRate}
                          </span>
                        )}
                      </div>

                      <h2 className="text-base font-bold text-slate-900 dark:text-white leading-snug flex items-center gap-2">
                        {item.listingType === 'transport' && (
                          <Train className="w-4 h-4 text-[var(--accent)] shrink-0" />
                        )}
                        <span>{item.title}</span>
                      </h2>

                      {item.subtitle && (
                        <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                          {item.subtitle}
                        </p>
                      )}

                      <div className="mt-2.5 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <p className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.location}</span>
                        </p>
                        {item.timing && (
                          <p className="flex items-center gap-1.5 font-mono-tabular">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>{item.timing}</span>
                          </p>
                        )}
                      </div>

                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {(item.contactPhone || item.externalUrl) && (
                    <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-700/70 flex items-center justify-between gap-3">
                      {item.contactPhone && (
                        <a
                          href={`tel:${item.contactPhone}`}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold min-h-[40px] ${
                            item.listingType === 'helpline'
                              ? 'bg-red-600 text-white hover:bg-red-700 w-full justify-center'
                              : 'bg-[var(--accent-soft)] text-[var(--accent)] hover:opacity-90'
                          }`}
                        >
                          <PhoneCall className="w-4 h-4" />
                          <span className="font-mono-tabular">Call {item.contactPhone}</span>
                        </a>
                      )}
                      {item.externalUrl && (
                        <a
                          href={item.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold min-h-[40px] hover:bg-emerald-700"
                        >
                          <span>Join Group / Open</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* Certificate Viewer Modal */}
      {activeCert && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveCert(null)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-3xl p-6 text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--accent)]">
                WDM Official Digital Certificate
              </span>
              <button
                type="button"
                onClick={() => setActiveCert(null)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl border-2 border-[var(--accent)]/40 bg-slate-50 dark:bg-slate-900 p-6 space-y-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Wyndhamganj Wale · Sonbhadra, UP
              </p>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {activeCert.eventName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Proudly presented to</p>
              <p className="text-2xl font-extrabold text-[var(--accent)]">
                {activeCert.participantName}
              </p>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {activeCert.handle} · {activeCert.role}
              </p>

              <div className="pt-3 flex items-center justify-center">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <QRCodeSVG
                    value={`WDM-VERIFY:${activeCert.certificateCode}:${activeCert.participantName}`}
                    size={96}
                  />
                </div>
              </div>
              <p className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                Code: {activeCert.certificateCode} · Issued {activeCert.issueDate}
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="w-full min-h-[46px] rounded-xl bg-[var(--accent)] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save Certificate PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Listing Modal */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="w-full sm:max-w-lg bg-white dark:bg-[#1E293B] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Add to {meta?.title}
              </h2>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateListing} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Title / Business Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={140}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Kirana, Single Room, Driver"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Rate / Rent / Salary
                  </label>
                  <input
                    type="text"
                    maxLength={80}
                    value={priceOrRate}
                    onChange={(e) => setPriceOrRate(e.target.value)}
                    placeholder="e.g., ₹2,500/month"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Location in Wyndhamganj *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    maxLength={20}
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono-tabular text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Timings / Availability
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={timing}
                  onChange={(e) => setTiming(e.target.value)}
                  placeholder="08:00 AM – 08:00 PM"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={VALIDATION.LISTING_DESC_MAX}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[46px] rounded-xl bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
              >
                {submitting ? 'Publishing...' : 'Publish Listing'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
