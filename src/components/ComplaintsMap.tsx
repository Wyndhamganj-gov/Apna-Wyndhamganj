import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AdvancedMarker,
  APILoadingStatus,
  APIProvider,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
  type MapMouseEvent,
} from '@vis.gl/react-google-maps';
import {
  Crosshair,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  ThumbsUp,
} from 'lucide-react';
import {
  formatRelativeTime,
  type Complaint,
  type ComplaintStatus,
} from '../types/wdm';

interface LatLngPoint {
  lat: number;
  lng: number;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const MAPS_ATTRIBUTION_IDS = ['gmp_mcp_codeassist_v1_aistudio'];
const INDIA_OVERVIEW_CENTER: LatLngPoint = { lat: 20.5937, lng: 78.9629 };

function checkAndDispatchQuotaError(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('QuotaExceeded') ||
    msg.includes('429')
  ) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
}

function getPinPalette(status: ComplaintStatus): {
  background: string;
  borderColor: string;
  glyphColor: string;
  label: string;
} {
  if (status === 'resolved') {
    return {
      background: '#059669',
      borderColor: '#047857',
      glyphColor: '#FFFFFF',
      label: 'समाधान हुआ (Resolved)',
    };
  }
  if (status === 'in_progress') {
    return {
      background: '#D97706',
      borderColor: '#B45309',
      glyphColor: '#FFFFFF',
      label: 'प्रगति पर (In Progress)',
    };
  }
  return {
    background: '#2563EB',
    borderColor: '#1D4ED8',
    glyphColor: '#FFFFFF',
    label: 'दर्ज (Submitted)',
  };
}

// Deterministic tiny visual dispersion (<= ~250m) when multiple complaints share the same resolved town center
function computeOffsetFromId(id: string, index: number): { dLat: number; dLng: number } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 360;
  }
  const angle = ((hash + index * 67) % 360) * (Math.PI / 180);
  const radius = 0.0012 + (index % 4) * 0.00055;
  return {
    dLat: Math.sin(angle) * radius,
    dLng: Math.cos(angle) * radius,
  };
}

interface ResolvedPoint {
  position: LatLngPoint;
  isExact: boolean;
}

interface ComplaintMarkerItemProps {
  complaint: Complaint;
  point: ResolvedPoint;
  isSelected: boolean;
  isSupported: boolean;
  toggling: boolean;
  onSelect: () => void;
  onClose: () => void;
  onToggleSupport: () => void;
}

const ComplaintMarkerItem: React.FC<ComplaintMarkerItemProps> = ({
  complaint,
  point,
  isSelected,
  isSupported,
  toggling,
  onSelect,
  onClose,
  onToggleSupport,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const palette = getPinPalette(complaint.status);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={point.position}
        title={`${complaint.category}: ${complaint.title}`}
        zIndex={isSelected ? 50 : 10}
        onClick={onSelect}
      >
        <Pin
          background={palette.background}
          borderColor={palette.borderColor}
          glyphColor={palette.glyphColor}
          scale={isSelected ? 1.25 : 1}
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} maxWidth={290} onCloseClick={onClose}>
          <div className="p-1 text-slate-900 space-y-2">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-bold text-violet-700">{complaint.category}</span>
              <span className="font-semibold text-slate-600">{palette.label}</span>
            </div>

            <h3 className="text-sm font-bold text-slate-900 leading-snug">
              {complaint.title}
            </h3>

            <p className="text-xs text-slate-600 flex items-start gap-1">
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-500" />
              <span>{complaint.location}</span>
            </p>

            <div className="text-[11px] text-slate-500 font-mono-tabular">
              {point.isExact ? 'Pinned GPS' : 'Area Approx'} · {point.position.lat.toFixed(4)},{' '}
              {point.position.lng.toFixed(4)} · {formatRelativeTime(complaint.createdAt)}
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 font-mono-tabular">
                {complaint.supporterCount} समर्थन
              </span>
              <button
                type="button"
                disabled={complaint.status === 'resolved' || toggling}
                onClick={onToggleSupport}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 ${
                  isSupported
                    ? 'bg-violet-700 text-white'
                    : 'bg-violet-100 text-violet-800 hover:bg-violet-200'
                }`}
              >
                <ThumbsUp className={`w-3 h-3 ${isSupported ? 'fill-current' : ''}`} />
                <span>{isSupported ? 'समर्थन किया' : 'मैं भी प्रभावित हूँ'}</span>
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

interface ComplaintsMapInnerProps {
  complaints: Complaint[];
  selectedComplaintId: string | null;
  supportedMap: Record<string, boolean>;
  togglingId: string | null;
  onSelectComplaint: (id: string | null) => void;
  onToggleSupport: (complaint: Complaint) => void;
}

const ComplaintsMapInner: React.FC<ComplaintsMapInnerProps> = ({
  complaints,
  selectedComplaintId,
  supportedMap,
  togglingId,
  onSelectComplaint,
  onToggleSupport,
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const apiStatus = useApiLoadingStatus();

  const [townCenter, setTownCenter] = useState<LatLngPoint | null>(null);
  const [resolvedAreas, setResolvedAreas] = useState<Record<string, LatLngPoint>>({});
  const [locating, setLocating] = useState(false);
  const [geoNotice, setGeoNotice] = useState('');
  const townInitializedRef = useRef(false);
  const attemptedAreasRef = useRef<Record<string, boolean>>({});

  // Resolve Wyndhamganj, Sonbhadra, Uttar Pradesh dynamically via Places API (New)
  const centerOnWyndhamganj = useCallback(async () => {
    if (!placesLib || !map) return;
    setLocating(true);
    try {
      const { places } = await placesLib.Place.searchByText({
        textQuery: 'Wyndhamganj, Sonbhadra, Uttar Pradesh, India',
        fields: ['location', 'viewport', 'displayName'],
        maxResultCount: 1,
      });
      const place = places?.[0];
      if (place?.location) {
        const coords: LatLngPoint = {
          lat: place.location.lat(),
          lng: place.location.lng(),
        };
        setTownCenter(coords);
        if (place.viewport) {
          map.fitBounds(place.viewport);
        } else {
          map.panTo(coords);
          map.setZoom(14);
        }
      }
    } catch (err) {
      checkAndDispatchQuotaError(err);
      setGeoNotice('Unable to center on Wyndhamganj right now.');
    } finally {
      setLocating(false);
    }
  }, [map, placesLib]);

  useEffect(() => {
    if (placesLib && map && !townInitializedRef.current) {
      townInitializedRef.current = true;
      centerOnWyndhamganj();
    }
  }, [placesLib, map, centerOnWyndhamganj]);

  // Dynamically resolve text locations for complaints without exact pinned coordinates (ephemeral memory only)
  useEffect(() => {
    if (!placesLib || !townCenter) return;
    const unpinnedLocations = Array.from(
      new Set(
        complaints
          .filter((c) => typeof c.latitude !== 'number' || typeof c.longitude !== 'number')
          .map((c) => c.location.trim())
          .filter((loc) => loc.length > 0 && !attemptedAreasRef.current[loc])
      )
    );

    if (unpinnedLocations.length === 0) return;

    let cancelled = false;
    async function resolveMissingLocations() {
      const updates: Record<string, LatLngPoint> = {};
      for (const locText of unpinnedLocations.slice(0, 6)) {
        attemptedAreasRef.current[locText] = true;
        try {
          const { places } = await placesLib!.Place.searchByText({
            textQuery: `${locText}, Wyndhamganj, Sonbhadra, Uttar Pradesh, India`,
            fields: ['location'],
            locationBias: {
              center: townCenter!,
              radius: 15000,
            },
            maxResultCount: 1,
          });
          const p = places?.[0];
          if (p?.location) {
            updates[locText] = {
              lat: p.location.lat(),
              lng: p.location.lng(),
            };
          }
        } catch (err) {
          checkAndDispatchQuotaError(err);
        }
      }
      if (!cancelled && Object.keys(updates).length > 0) {
        setResolvedAreas((prev) => ({ ...prev, ...updates }));
      }
    }

    resolveMissingLocations();
    return () => {
      cancelled = true;
    };
  }, [complaints, placesLib, townCenter]);

  // Map every complaint to a ResolvedPoint (exact user pin preferred, otherwise Google Places area result)
  const complaintPoints = useMemo(() => {
    const result: Record<string, ResolvedPoint> = {};
    complaints.forEach((c, idx) => {
      if (typeof c.latitude === 'number' && typeof c.longitude === 'number') {
        result[c.id] = {
          position: { lat: c.latitude, lng: c.longitude },
          isExact: true,
        };
        return;
      }
      const resolved = resolvedAreas[c.location.trim()] || townCenter;
      if (resolved) {
        const offset = computeOffsetFromId(c.id, idx);
        result[c.id] = {
          position: {
            lat: resolved.lat + offset.dLat,
            lng: resolved.lng + offset.dLng,
          },
          isExact: false,
        };
      }
    });
    return result;
  }, [complaints, resolvedAreas, townCenter]);

  // Pan smoothly to selected complaint when triggered from a complaint card
  useEffect(() => {
    if (!selectedComplaintId || !map) return;
    const pt = complaintPoints[selectedComplaintId];
    if (pt) {
      map.panTo(pt.position);
      if ((map.getZoom() || 12) < 15) {
        map.setZoom(15);
      }
    }
  }, [selectedComplaintId, complaintPoints, map]);

  const handleMyLocation = () => {
    if (!navigator.geolocation || !map) {
      setGeoNotice('Browser GPS is unavailable on this device.');
      return;
    }
    setGeoNotice('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        map.panTo(coords);
        map.setZoom(15);
      },
      () => {
        setGeoNotice('Location permission denied. You can still pan or tap any pin.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  if (apiStatus === APILoadingStatus.FAILED || apiStatus === APILoadingStatus.AUTH_FAILURE) {
    return (
      <div className="h-[380px] rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-6 text-center">
        <MapPin className="w-8 h-8 text-slate-400 mb-2" />
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Interactive map unavailable right now
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
          Please check your network connection or Maps configuration. All civic complaints remain accessible in List view.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-700/80 rounded-2xl overflow-hidden">
      {/* Compact Map Toolbar & Legend */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-bold text-slate-900 dark:text-white">
            Wyndhamganj Issue Map ({complaints.length})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" aria-hidden="true" />
            <span>दर्ज (Submitted)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600" aria-hidden="true" />
            <span>प्रगति पर</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" aria-hidden="true" />
            <span>समाधान हुआ</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={centerOnWyndhamganj}
            disabled={locating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 min-h-[36px] whitespace-nowrap cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Center Wyndhamganj</span>
          </button>
          <button
            type="button"
            onClick={handleMyLocation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 min-h-[36px] whitespace-nowrap cursor-pointer"
          >
            <LocateFixed className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>My GPS</span>
          </button>
        </div>
      </div>

      {geoNotice && (
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
          {geoNotice}
        </div>
      )}

      {/* Explicitly Sized Google Map Canvas (CF2) */}
      <div className="w-full h-[380px] sm:h-[440px] relative">
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={INDIA_OVERVIEW_CENTER}
          defaultZoom={5}
          gestureHandling="greedy"
          streetViewControl={false}
          fullscreenControl={true}
          mapTypeControl={true}
          internalUsageAttributionIds={MAPS_ATTRIBUTION_IDS}
          style={{ width: '100%', height: '100%' }}
          onClick={() => onSelectComplaint(null)}
        >
          {complaints.map((complaint) => {
            const point = complaintPoints[complaint.id];
            if (!point) return null;
            return (
              <ComplaintMarkerItem
                key={complaint.id}
                complaint={complaint}
                point={point}
                isSelected={selectedComplaintId === complaint.id}
                isSupported={Boolean(supportedMap[complaint.id])}
                toggling={togglingId === complaint.id}
                onSelect={() => onSelectComplaint(complaint.id)}
                onClose={() => onSelectComplaint(null)}
                onToggleSupport={() => onToggleSupport(complaint)}
              />
            );
          })}
        </GoogleMap>
      </div>
    </div>
  );
};

export interface ComplaintsMapProps {
  complaints: Complaint[];
  selectedComplaintId: string | null;
  supportedMap: Record<string, boolean>;
  togglingId: string | null;
  onSelectComplaint: (id: string | null) => void;
  onToggleSupport: (complaint: Complaint) => void;
}

export const ComplaintsMap: React.FC<ComplaintsMapProps> = (props) => {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center">
        <MapPin className="w-7 h-7 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Google Maps API key not configured
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Add VITE_GOOGLE_MAPS_API_KEY in environment settings to enable the live Wyndhamganj geolocation map.
        </p>
      </div>
    );
  }

  return (
    <APIProvider
      apiKey={GOOGLE_MAPS_API_KEY}
      libraries={['marker', 'places']}
      language="en"
      region="IN"
    >
      <ComplaintsMapInner {...props} />
    </APIProvider>
  );
};

/* --- Interactive Map Location Picker for Filing New Complaints --- */

interface PickerInnerProps {
  selectedCoords: LatLngPoint | null;
  onSelectCoords: (coords: LatLngPoint, suggestedLabel?: string) => void;
}

const LocationPickerInner: React.FC<PickerInnerProps> = ({ selectedCoords, onSelectCoords }) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [pickerMessage, setPickerMessage] = useState('Tap anywhere on the map to pin the exact issue spot.');
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!placesLib || !map || initializedRef.current) return;
    initializedRef.current = true;
    (async () => {
      try {
        const { places } = await placesLib.Place.searchByText({
          textQuery: 'Wyndhamganj, Sonbhadra, Uttar Pradesh, India',
          fields: ['location', 'viewport'],
          maxResultCount: 1,
        });
        const place = places?.[0];
        if (place?.viewport) {
          map.fitBounds(place.viewport);
        } else if (place?.location) {
          map.panTo({ lat: place.location.lat(), lng: place.location.lng() });
          map.setZoom(14);
        }
      } catch (err) {
        checkAndDispatchQuotaError(err);
      }
    })();
  }, [placesLib, map]);

  const handleMapClick = (event: MapMouseEvent) => {
    const ll = event.detail.latLng;
    if (!ll) return;
    onSelectCoords({ lat: ll.lat, lng: ll.lng });
    setPickerMessage(`Pinned: ${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}`);
  };

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      setPickerMessage('GPS is not available in this browser.');
      return;
    }
    setPickerMessage('Detecting current GPS location...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onSelectCoords(coords);
        if (map) {
          map.panTo(coords);
          map.setZoom(16);
        }
        setPickerMessage(`GPS pinned: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
      },
      () => {
        setPickerMessage('GPS permission declined. Tap directly on the map instead.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handlePlaceSearch = async () => {
    const q = searchText.trim();
    if (!q || !placesLib || !map) return;
    setSearching(true);
    try {
      const { places } = await placesLib.Place.searchByText({
        textQuery: `${q}, Wyndhamganj, Sonbhadra, Uttar Pradesh, India`,
        fields: ['location', 'displayName', 'formattedAddress'],
        maxResultCount: 1,
      });
      const place = places?.[0];
      if (place?.location) {
        const coords = { lat: place.location.lat(), lng: place.location.lng() };
        onSelectCoords(coords, place.displayName || q);
        map.panTo(coords);
        map.setZoom(16);
        setPickerMessage(`Located: ${place.displayName || q}`);
      } else {
        setPickerMessage('No matching landmark found. Tap directly on the map to drop a pin.');
      }
    } catch (err) {
      checkAndDispatchQuotaError(err);
      setPickerMessage('Search unavailable right now. Tap on the map to place a pin.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[180px] flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handlePlaceSearch();
              }
            }}
            placeholder="Find landmark in Wyndhamganj..."
            className="flex-1 px-3 py-2 text-xs bg-transparent text-slate-900 dark:text-white focus:outline-none"
          />
          <button
            type="button"
            onClick={handlePlaceSearch}
            disabled={searching}
            aria-label="Search landmark"
            className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:text-[var(--accent)] cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentGps}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-semibold min-h-[38px] whitespace-nowrap cursor-pointer"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Use My GPS</span>
        </button>
      </div>

      <div className="w-full h-[210px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={selectedCoords || INDIA_OVERVIEW_CENTER}
          defaultZoom={selectedCoords ? 15 : 5}
          gestureHandling="greedy"
          streetViewControl={false}
          fullscreenControl={false}
          mapTypeControl={false}
          internalUsageAttributionIds={MAPS_ATTRIBUTION_IDS}
          style={{ width: '100%', height: '100%' }}
          onClick={handleMapClick}
        >
          {selectedCoords && (
            <AdvancedMarker position={selectedCoords} title="Selected issue location">
              <Pin background="#DC2626" borderColor="#991B1B" glyphColor="#FFFFFF" />
            </AdvancedMarker>
          )}
        </GoogleMap>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular">
        {pickerMessage}
      </p>
    </div>
  );
};

export const ComplaintLocationPicker: React.FC<PickerInnerProps> = (props) => {
  if (!GOOGLE_MAPS_API_KEY) {
    return null;
  }
  return (
    <APIProvider
      apiKey={GOOGLE_MAPS_API_KEY}
      libraries={['marker', 'places']}
      language="en"
      region="IN"
    >
      <LocationPickerInner {...props} />
    </APIProvider>
  );
};
