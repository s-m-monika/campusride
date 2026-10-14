import React, { useEffect, useState } from 'react';
import { Download, X, Share, Plus, Smartphone } from 'lucide-react';

// True when the app is already launched from the home screen / installed.
const isStandalone = () =>
  (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
  window.navigator.standalone === true;

// iOS Safari never fires `beforeinstallprompt`, so we show manual steps there.
const isIOS = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent || '') && !window.MSStream;

// Global "install this app" nudge. Rendered once at the app root. It:
//  - auto-opens as soon as the browser offers a native install prompt,
//  - shows Add-to-Home-Screen steps on iOS,
//  - can be re-opened any time via window event 'campusride:install'.
const InstallPrompt = () => {
  const [deferred, setDeferred] = useState(null);
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return undefined;

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
      if (!sessionStorage.getItem('campusride_install_dismissed')) setOpen(true);
    };
    const onInstalled = () => {
      setOpen(false);
      setDeferred(null);
    };
    const onManual = () => setOpen(true);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('campusride:install', onManual);

    if (isIOS()) {
      setIos(true);
      if (!sessionStorage.getItem('campusride_install_dismissed')) setOpen(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('campusride:install', onManual);
    };
  }, []);

  const dismiss = () => {
    sessionStorage.setItem('campusride_install_dismissed', '1');
    setOpen(false);
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try {
      const choice = await deferred.userChoice;
      if (choice?.outcome === 'accepted') setOpen(false);
    } catch {
      /* user dismissed the native sheet */
    }
    setDeferred(null);
  };

  if (!open || isStandalone()) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-3">
          <img src="/pwa-192.png" alt="CampusRide" className="w-14 h-14 rounded-2xl shadow-md" />
          <div>
            <h3 className="text-lg font-black text-gray-900">Install CampusRide</h3>
            <p className="text-[11px] text-gray-500 font-bold">Home-screen app · works offline</p>
          </div>
        </div>

        <p className="text-xs text-gray-600 mb-4 leading-relaxed">
          Install this app for one-tap access, a full-screen view and offline support — no app store needed.
        </p>

        {ios && (
          <ol className="text-xs text-gray-700 space-y-2.5 mb-5">
            <li className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-black flex items-center justify-center shrink-0">1</span>
              <span>Tap the <Share className="inline w-3.5 h-3.5 -mt-0.5" /> <strong>Share</strong> icon in Safari</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-black flex items-center justify-center shrink-0">2</span>
              <span>Choose <Plus className="inline w-3.5 h-3.5 -mt-0.5" /> <strong>Add to Home Screen</strong></span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-black flex items-center justify-center shrink-0">3</span>
              <span>Tap <strong>Add</strong></span>
            </li>
          </ol>
        )}

        {deferred && (
          <button
            onClick={install}
            className="w-full py-3.5 bg-[#EA5858] hover:bg-[#dc4848] text-white font-extrabold text-sm rounded-full shadow-lg shadow-red-200 flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Install app</span>
          </button>
        )}

        {!deferred && !ios && (
          <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-2xl text-[11px] text-blue-800 font-bold mb-4">
            <Smartphone className="w-4 h-4 shrink-0" />
            <span>Open this site in Chrome (Android) or Safari (iPhone) to install.</span>
          </div>
        )}

        <button
          onClick={dismiss}
          className="w-full mt-2 py-2.5 text-gray-500 font-bold rounded-2xl text-xs hover:bg-gray-50"
        >
          Not now
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
