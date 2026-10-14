import React, { useState } from 'react';
import { ArrowLeft, Menu, PhoneCall, HelpCircle, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SOSModal from './SOSModal';

const Header = ({
  title,
  showBack = false,
  onBack,
  showSOS = false,
  showHelp = true,
  rightElement
}) => {
  const navigate = useNavigate();
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <>
      <header className="px-5 pb-3.5 pt-safe-plus flex items-center justify-between bg-white/95 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          {showBack ? (
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center font-extrabold text-sm shadow-sm">
                CR
              </div>
              <span className="font-extrabold text-gray-900 tracking-tight text-lg">
                CampusRide
              </span>
            </div>
          )}
          {title && (
            <h1 className="font-bold text-gray-800 text-base truncate max-w-[180px]">
              {title}
            </h1>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {rightElement}

          {showSOS && (
            <button
              onClick={() => setIsSosOpen(true)}
              className="flex items-center space-x-1 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold rounded-full text-xs shadow-md tracking-wider animate-pulse"
            >
              <ShieldAlert className="w-4 h-4 fill-white" />
              <span>SOS</span>
            </button>
          )}

          {showHelp && !showSOS && (
            <button
              onClick={() => setIsHelpOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-full text-xs font-semibold border border-red-100 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-red-500" />
              <span>Help</span>
            </button>
          )}
        </div>
      </header>

      {/* SOS Modal */}
      <SOSModal isOpen={isSosOpen} onClose={() => setIsSosOpen(false)} />

      {/* Help Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-gray-900 mb-1">CampusRide SAIT Assistance</h3>
            <p className="text-xs text-gray-500 mb-4">Sambhram Institute of Technology (SAIT), Vidyaranyapura</p>
            <div className="text-xs text-gray-700 space-y-2 mb-4 leading-relaxed">
              <p>• <strong>Campus Rule:</strong> At least one location must be Sambhram Institute of Technology (SAIT).</p>
              <p>• <strong>Pink Ride:</strong> Women-only safety rides paired exclusively with verified female riders.</p>
              <p>• <strong>Ride Start PIN:</strong> Give your 4-digit PIN to the captain upon pickup to start the ride.</p>
              <p>• <strong>SAIT Security:</strong> Call 080-23648444 for campus security assistance.</p>
            </div>
            <button
              onClick={() => setIsHelpOpen(false)}
              className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-2xl text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
