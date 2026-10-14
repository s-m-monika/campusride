import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { User, Bike, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

const RoleSelectScreen = () => {
  const navigate = useNavigate();
  const { switchMode, user } = useAuth();
  // A user's actual role is fixed at registration. Drivers may still choose to
  // ride as a passenger; passengers cannot become drivers here (that needs a
  // separate verified driver account). So we only let a driver pick a mode.
  const canDrive = user?.role === 'driver';
  const [selectedRole, setSelectedRole] = useState(canDrive ? 'driver' : 'passenger');

  const handleContinue = async () => {
    if (selectedRole === 'driver' && canDrive) {
      switchMode('driver');
      navigate('/driver-setup');
    } else {
      switchMode('passenger');
      navigate('/home');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header title="Select Mode" showBack={true} onBack={() => navigate('/login')} showHelp={true} />

      <div className="flex-1 px-6 py-6 flex flex-col justify-between">
        <div>
          <div className="mb-6">
            <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-red-100 text-red-700 rounded-full tracking-wider">
              Sambhram Institute of Technology (SAIT)
            </span>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight mt-2">
              Select Your Travel Role
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Are you booking a ride, or offering your vehicle seats to campus peers?
            </p>
          </div>

          <div className="space-y-4">
            {/* PASSENGER ROLE */}
            <div
              onClick={() => setSelectedRole('passenger')}
              className={`p-5 rounded-3xl border-2 cursor-pointer transition-all ${
                selectedRole === 'passenger'
                  ? 'border-red-500 bg-red-50/40 shadow-md ring-2 ring-red-100'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-2xl shadow-sm">
                  🎒
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-base text-gray-900">
                      PASSENGER
                    </h3>
                    {selectedRole === 'passenger' && (
                      <CheckCircle2 className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Book peer rides to/from SAIT Campus & Vidyaranyapura
                  </p>
                  <span className="inline-block mt-2 text-[10px] font-extrabold text-red-600 uppercase">
                    • Instant Algorithm Proximity Matching
                  </span>
                </div>
              </div>
            </div>

            {/* RIDER / DRIVER ROLE */}
            <div
              onClick={() => setSelectedRole('driver')}
              className={`p-5 rounded-3xl border-2 cursor-pointer transition-all ${
                selectedRole === 'driver'
                  ? 'border-blue-600 bg-blue-50/40 shadow-md ring-2 ring-blue-100'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-2xl shadow-sm">
                  🛵
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-base text-gray-900">
                      RIDER / DRIVER
                    </h3>
                    {selectedRole === 'driver' && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Provide rides, share empty seats, and earn per kilometer
                  </p>
                  <span className="inline-block mt-2 text-[10px] font-extrabold text-blue-600 uppercase">
                    • Requires DL, Vehicle RC & Aadhar Verification
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6">
          <button
            onClick={handleContinue}
            className="w-full py-4 bg-[#EA5858] hover:bg-[#dc4848] active:scale-98 text-white font-extrabold text-lg rounded-full shadow-lg shadow-red-200 transition-all flex items-center justify-center space-x-2"
          >
            <span>Continue as {selectedRole === 'passenger' ? 'Passenger' : 'Rider'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelectScreen;
