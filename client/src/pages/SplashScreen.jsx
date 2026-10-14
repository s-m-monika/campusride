import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';

const SplashScreen = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white relative overflow-hidden">
      {/* Top Hero Image matching User Figma Uploaded Image 1 */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-4 text-center">
        {/* College Tag */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 bg-red-50 border border-red-100 rounded-full mb-3">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          <span className="text-[11px] font-black text-red-600 tracking-wider uppercase">
            Sambhram Institute of Technology (SAIT)
          </span>
        </div>

        {/* Real User Figma Uploaded Image 1 */}
        <div className="w-full max-w-[360px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-50 relative group">
          <img
            src="/assets/welcome_students.jpg"
            alt="CampusRide SAIT Students"
            className="w-full h-auto object-cover max-h-[380px]"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 pt-8 text-white text-left">
            <span className="text-[10px] font-black tracking-widest text-red-400 uppercase block">
              SAIT Campus Transport
            </span>
            <p className="text-xs font-bold text-white/95">
              Verified Student & Faculty Ride-Sharing
            </p>
          </div>
        </div>

        {/* Carousel Dots */}
        <div className="flex items-center space-x-2 my-4">
          <span className="w-2 h-2 rounded-full bg-gray-300"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span>
          <span className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-sm"></span>
        </div>

        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
          Smart Campus Rides
        </h2>
        <p className="text-xs text-gray-500 mt-1 max-w-[300px] leading-relaxed">
          Safe, affordable peer travel across Sambhram Institute of Technology (SAIT) & Vidyaranyapura.
        </p>
      </div>

      {/* Bottom Action Area */}
      <div className="p-6 pb-8 bg-white border-t border-gray-100 flex flex-col items-center shadow-lg">
        <button
          onClick={handleGetStarted}
          className="w-full max-w-sm py-4 bg-[#EA5858] hover:bg-[#dc4848] active:scale-98 text-white font-extrabold text-lg rounded-full shadow-lg shadow-red-200 transition-all flex items-center justify-center space-x-2"
        >
          <span>Get Started</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <div className="mt-4 flex items-center space-x-4 text-[11px] text-gray-500 font-bold">
          <span className="flex items-center">
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" /> 100% SAIT USN Verified
          </span>
          <span className="flex items-center">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-pink-500" /> Pink Ride Enabled
          </span>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
