import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRide } from '../context/RideContext';
import Header from '../components/Header';
import MapView from '../components/MapView';
import { calculateFare } from '../services/geo';
import { CURRENCY } from '../config/appConfig';
import { MapPin, Clock, Route as RouteIcon, Loader2, AlertCircle, Sparkles } from 'lucide-react';

// Shows the REAL routed trip and lets the rider request a ride. The rider never
// picks a driver — the system matches one automatically after the request.
const RideConfirmation = () => {
  const navigate = useNavigate();
  const {
    pickup,
    destination,
    route,
    routeError,
    vehicleType,
    setVehicleType,
    pinkRide,
    requestRide,
    bookingLoading,
    activeRide,
  } = useRide();

  const [error, setError] = useState('');

  // No route (e.g. user refreshed) → go back to plan a trip.
  useEffect(() => {
    if (!pickup || !destination || !route) navigate('/home');
  }, [pickup, destination, route, navigate]);

  // Once a request becomes active, move to the tracking screen.
  useEffect(() => {
    if (activeRide) navigate('/tracking');
  }, [activeRide, navigate]);

  if (!route) return null;

  const bikeFare = calculateFare('Bike', route.distanceKm);
  const carFare = calculateFare('Car', route.distanceKm);
  const activeFare = vehicleType === 'Car' ? carFare : bikeFare;

  const handleRequest = async () => {
    setError('');
    const res = await requestRide();
    if (res?.success) {
      navigate('/tracking');
    } else {
      setError(res?.message || 'Could not request the ride.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header title="Confirm ride" showBack onBack={() => navigate('/home')} showHelp />

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="h-[34vh] w-full relative">
          <MapView
            center={[pickup.lat, pickup.lng]}
            pickupCoords={pickup}
            dropCoords={destination}
            routeGeometry={route.geometry}
            showRoute
            className="h-full w-full rounded-none"
          />
          <div className="absolute bottom-3 right-4 z-20 bg-slate-900/95 text-white px-3.5 py-1.5 rounded-2xl shadow-xl text-right">
            <p className="text-[9px] text-gray-400 font-bold uppercase">OSRM route</p>
            <p className="text-xs font-black">
              {route.distanceKm} km • {route.durationMin} min
            </p>
          </div>
        </div>

        <div className="flex-1 -mt-5 bg-white rounded-t-3xl shadow-2xl z-20 px-5 pt-4 pb-6 flex flex-col overflow-y-auto">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-3" />

          {/* Trip summary */}
          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 mb-3 space-y-2 text-xs">
            <div className="flex items-start space-x-2">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-bold text-gray-900 truncate">{pickup.shortName || pickup.name}</span>
            </div>
            <div className="flex items-start space-x-2">
              <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="font-bold text-gray-900 truncate">{destination.shortName || destination.name}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-gray-500 font-bold">
              <span className="flex items-center space-x-1">
                <RouteIcon className="w-3.5 h-3.5" /> <span>{route.distanceKm} km</span>
              </span>
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" /> <span>~{route.durationMin} min</span>
              </span>
            </div>
          </div>

          {routeError && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-2xl">
              {routeError}
            </div>
          )}

          {pinkRide && (
            <div className="mb-3 p-2.5 bg-pink-50 border border-pink-200 rounded-2xl flex items-center space-x-2 text-[11px] font-bold text-pink-800">
              <Sparkles className="w-4 h-4 text-pink-500" />
              <span>Pink Ride — only verified female drivers will be offered this request.</span>
            </div>
          )}

          {/* Vehicle + fare tiles */}
          <div className="space-y-2 mb-3">
            {[
              { t: 'Bike', fare: bikeFare, rate: '₹5/km', img: '/assets/bike_option.jpg' },
              { t: 'Car', fare: carFare, rate: '₹5/km', img: '/assets/car_option.jpg' },
            ].map((v) => (
              <button
                key={v.t}
                onClick={() => setVehicleType(v.t)}
                className={`w-full p-3 rounded-2xl border-2 flex items-center justify-between transition-all ${
                  vehicleType === v.t ? 'border-red-500 bg-red-50/30 ring-1 ring-red-200' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-gray-200 flex items-center justify-center p-1 overflow-hidden">
                    <img src={v.img} alt={v.t} className="w-full h-full object-contain" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-black text-sm text-gray-900">{v.t}</h4>
                    <p className="text-[11px] text-gray-500">{route.durationMin} min • {route.distanceKm} km</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-gray-900">
                    {CURRENCY}
                    {v.fare}
                  </span>
                  <span className="text-[10px] text-gray-400 block font-bold">{v.rate}</span>
                </div>
              </button>
            ))}
          </div>

          <p className="text-[10px] text-gray-400 text-center mb-2">
            Estimated fare only. No in-app payment is processed.
          </p>

          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-1 mt-auto">
            <button
              onClick={handleRequest}
              disabled={bookingLoading}
              className="w-full py-4 bg-[#EA5858] hover:bg-[#dc4848] text-white font-extrabold text-base rounded-full shadow-lg shadow-red-200 flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              {bookingLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Requesting…</span>
                </>
              ) : (
                <span>
                  Request ride • {CURRENCY}
                  {activeFare}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RideConfirmation;
