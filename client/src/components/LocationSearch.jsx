import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, LocateFixed, Loader2, X } from 'lucide-react';
import { searchPlaces, reverseGeocode } from '../services/geo';
import { getCurrentPosition } from '../services/location';
import { CAMPUS_SHORTCUTS } from '../context/RideContext';

// A responsible place-search box. It debounces input (600ms) and only queries
// Nominatim after 3+ characters so we respect the public service's usage policy
// (no aggressive autocomplete). Also offers campus shortcuts and current GPS.
const LocationSearch = ({ label, color = 'emerald', value, onSelect, onClose }) => {
  const [text, setText] = useState(value?.name || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const onChange = (e) => {
    const v = e.target.value;
    setText(v);
    setError('');
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();
    if (v.trim().length < 3) {
      setResults([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        abortRef.current = new AbortController();
        const r = await searchPlaces(v, abortRef.current.signal);
        setResults(r);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 600);
  };

  const useCurrentLocation = async () => {
    setError('');
    setGeoLoading(true);
    try {
      const pos = await getCurrentPosition();
      const name = (await reverseGeocode(pos.lat, pos.lng)) || 'Current location';
      onSelect({ name, lat: pos.lat, lng: pos.lng });
    } catch (err) {
      // Real fallback message when permission denied / unavailable.
      setError(err.message);
    } finally {
      setGeoLoading(false);
    }
  };

  const dot = color === 'red' ? 'bg-red-500' : 'bg-emerald-500';

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className="p-4 px-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${dot}`} />
            <h3 className="font-black text-base text-gray-900">{label}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              autoFocus
              value={text}
              onChange={onChange}
              placeholder="Search a place (min 3 letters)…"
              className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          <button
            onClick={useCurrentLocation}
            disabled={geoLoading}
            className="mt-3 w-full flex items-center justify-center space-x-2 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-2xl text-xs"
          >
            {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
            <span>{geoLoading ? 'Getting your location…' : 'Use my current location'}</span>
          </button>

          {error && <p className="text-xs text-red-600 font-bold mt-2">{error}</p>}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {text.trim().length < 3 && (
            <>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1 px-1">
                Campus shortcuts
              </p>
              {CAMPUS_SHORTCUTS.map((s) => (
                <ResultRow key={s.name} place={s} onSelect={onSelect} />
              ))}
            </>
          )}

          {loading && (
            <div className="py-4 flex items-center justify-center text-xs text-gray-400 space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-red-500" />
              <span>Searching…</span>
            </div>
          )}

          {!loading && text.trim().length >= 3 && results.length === 0 && !error && (
            <p className="py-6 text-center text-xs text-gray-400">No places found.</p>
          )}

          {results.map((r, i) => (
            <ResultRow key={`${r.lat}-${r.lng}-${i}`} place={r} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </div>
  );
};

function ResultRow({ place, onSelect }) {
  return (
    <button
      onClick={() => onSelect(place)}
      className="w-full py-3 flex items-start space-x-3 text-left hover:bg-gray-50 rounded-xl px-2 transition-colors"
    >
      <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="font-bold text-sm text-gray-900 truncate">{place.shortName || place.name}</p>
        <p className="text-[11px] text-gray-500 truncate">{place.desc || place.name}</p>
      </div>
    </button>
  );
}

export default LocationSearch;
