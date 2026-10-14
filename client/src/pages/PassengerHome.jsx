import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRide } from '../context/RideContext';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import MapView from '../components/MapView';
import LocationSearch from '../components/LocationSearch';
import RecentRides from '../components/RecentRides';
import { fetchRoute } from '../services/geo';
import { MAP_CENTER, VERIFICATION_STATUS, ROLES } from '../config/appConfig';
import { Search, ArrowUpDown, Loader2, AlertCircle, ShieldAlert, Sparkles, Car } from 'lucide-react';

const PassengerHome = () => {
  const navigate = useNavigate();
  const { user, switchMode } = useAuth();
  const {
    pickup,
    setPickup,
    destination,
    setDestination,
    vehicleType,
    setVehicleType,
    pinkRide,
    setPinkRide,
    setRoute,
    setRouteError,
    activeRide,
  } = useRide();

  const [sheet, setSheet] = useState(null); // 'pickup' | 'drop' | null
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState('');

  // If there's already an active ride, send the rider to tracking.
  React.useEffect(() => {
    if (activeRide) navigate('/tracking');
  }, [activeRide, navigate]);

  const verified = user?.verificationStatus === VERIFICATION_STATUS.APPROVED;

  const swap = () => {
    const t = pickup;
    setPickup(destination);
    setDestination(t);
  };

  const proceed = async () => {
    setError('');
    if (!pickup || !destination) {
      setError('Choose both a pickup and a destination.');
      return;
    }
    if (pickup.lat === destination.lat && pickup.lng === destination.lng) {
      setError('Pickup and destination cannot be the same.');
      return;
    }
    setComputing(true);
    try {
      // Real OSRM route — never fabricated. If it fails we show the error.
      const r = await fetchRoute(pickup, destination);
      setRoute(r);
      setRouteError('');
      navigate('/confirm');
    } catch (e) {
      setRoute(null);
      setRouteError(e.message);
      setError(e.message);
    } finally {
      setComputing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header title="" showBack={false} showHelp />

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="h-[38vh] w-full relative">
          <MapView
            center={[MAP_CENTER.lat, MAP_CENTER.lng]}
            zoom={14}
            pickupCoords={pickup}
            dropCoords={destination}
            showRoute={false}
            className="h-full w-full rounded-none"
          />
          <div className="absolute top-3 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
            <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-md border border-gray-100 flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[11px] font-black text-gray-900">Campus Zone</span>
            </div>
            {user && (
              <div className="bg-white/95 backdrop-blur-md px-3 py-1 rounded-2xl shadow-md text-[11px] font-bold text-gray-800">
                {user.name} · <span className="uppercase text-gray-500">{user.role}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 -mt-6 bg-white rounded-t-3xl shadow-2xl z-20 px-5 pt-4 pb-6 flex flex-col overflow-y-auto border-t border-gray-100">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-3" />

          {/* This account is a DRIVER viewing passenger mode → let them switch
              back to the driver dashboard (where Go online lives). */}
          {user?.role === ROLES.DRIVER && (
            <button
              onClick={() => {
                switchMode('driver');
                navigate('/driver');
              }}
              className="w-full mb-3 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-between"
            >
              <span className="flex items-center space-x-2 text-sm font-extrabold">
                <Car className="w-4 h-4" />
                <span>Go to Driver Dashboard</span>
              </span>
              <span className="text-[11px] font-bold opacity-90">Online &amp; accept rides →</span>
            </button>
          )}

          {/* Verification notice */}
          {!verified && (
            <button
              onClick={() => navigate('/verify-id')}
              className="w-full mb-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center space-x-2 text-left"
            >
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-[11px] font-bold text-amber-800">
                {user?.verificationStatus === VERIFICATION_STATUS.PENDING
                  ? 'Your college ID is pending verification. You can still plan a ride.'
                  : 'Verify your college ID to be fully verified. Tap to start.'}
              </span>
            </button>
          )}

          {/* Pickup + destination pickers */}
          <div className="flex items-center space-x-3">
            <div className="flex flex-col items-center pt-2">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
              <div className="w-0.5 h-10 bg-gray-200 my-1" />
              <div className="w-3.5 h-3.5 rounded-full bg-red-500 ring-4 ring-red-100" />
            </div>
            <div className="flex-1 space-y-2">
              <button
                onClick={() => setSheet('pickup')}
                className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200 text-left"
              >
                <span className="text-[10px] text-gray-400 block uppercase font-black">Pickup</span>
                <span className="text-sm font-bold text-gray-900 truncate block">
                  {pickup?.shortName || pickup?.name || 'Choose pickup'}
                </span>
              </button>
              <button
                onClick={() => setSheet('drop')}
                className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200 text-left"
              >
                <span className="text-[10px] text-gray-400 block uppercase font-black">Destination</span>
                <span className="text-sm font-bold text-gray-900 truncate block">
                  {destination?.shortName || destination?.name || 'Choose destination'}
                </span>
              </button>
            </div>
            <button
              onClick={swap}
              className="p-2.5 bg-white hover:bg-gray-100 rounded-xl border border-gray-200 text-gray-600"
              aria-label="Swap pickup and destination"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>

          {/* Vehicle selection */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[
              { t: 'Bike', img: '/assets/bike_option.jpg', rate: '₹5 / km' },
              { t: 'Car', img: '/assets/car_option.jpg', rate: '₹5 / km' },
            ].map((v) => (
              <button
                key={v.t}
                onClick={() => setVehicleType(v.t)}
                className={`p-2 rounded-3xl border-2 flex flex-col items-center bg-white transition-all ${
                  vehicleType === v.t ? 'border-blue-600 ring-2 ring-blue-100' : 'border-gray-200'
                }`}
              >
                <div className="w-full aspect-square max-h-28 rounded-2xl overflow-hidden flex items-center justify-center bg-slate-50">
                  <img src={v.img} alt={v.t} className="w-full h-full object-contain" />
                </div>
                <div className="text-center py-1">
                  <span className="text-[11px] font-black text-gray-900 block">{v.t}</span>
                  <span className="text-[10px] text-gray-500 font-bold">{v.rate}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Pink ride toggle */}
          <button
            onClick={() => setPinkRide(!pinkRide)}
            className={`mt-3 rounded-2xl border-2 p-3 flex items-center justify-between transition-all ${
              pinkRide ? 'border-pink-500 ring-2 ring-pink-100 bg-pink-50' : 'border-pink-200 bg-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-pink-500" />
              <span className="text-xs font-black text-pink-900">Pink Ride (women-only, verified female drivers)</span>
            </div>
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                pinkRide ? 'bg-pink-600 text-white' : 'bg-pink-100 text-pink-700'
              }`}
            >
              {pinkRide ? 'ON' : 'OFF'}
            </span>
          </button>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Ride history — completed trips tracked for this passenger */}
          <div className="mt-4">
            <RecentRides roleField="riderId" title="Your recent rides" />
          </div>

          <div className="pt-4 mt-auto">
            <button
              onClick={proceed}
              disabled={computing}
              className="w-full py-4 bg-[#EA5858] hover:bg-[#dc4848] text-white font-extrabold text-base rounded-full shadow-lg shadow-red-200 flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              {computing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Calculating route…</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>Find route &amp; fare</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {sheet === 'pickup' && (
        <LocationSearch
          label="Set pickup location"
          color="emerald"
          value={pickup}
          onSelect={(p) => {
            setPickup(p);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'drop' && (
        <LocationSearch
          label="Set destination"
          color="red"
          value={destination}
          onSelect={(p) => {
            setDestination(p);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default PassengerHome;
