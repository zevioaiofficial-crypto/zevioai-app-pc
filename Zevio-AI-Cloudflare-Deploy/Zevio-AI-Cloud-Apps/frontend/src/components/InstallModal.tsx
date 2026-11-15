import React, { useState, useEffect } from "react";
import { X, Smartphone, Share2, PlusSquare, ArrowUpRight, Check, Download } from "lucide-react";

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  isIOS: boolean;
  isStandalone: boolean;
}

export const InstallModal: React.FC<InstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  isIOS,
  isStandalone
}) => {
  const [installed, setInstalled] = useState(isStandalone);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setInstalled(true);
        setTimeout(onClose, 1500);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-indigo-500/20">
              Z
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">បន្ថែម Zevio AI ទៅកាន់ Home Screen</h3>
              <p className="text-[11px] text-slate-400">ដំឡើងជា App លើទូរស័ព្ទ (Install to Phone Home Screen)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4">
          {installed ? (
            <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                <Check className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-emerald-300">Zevio AI is Installed</p>
              <p className="text-[11px] text-slate-400">
                You can launch it anytime directly from your phone home screen without browser bars.
              </p>
            </div>
          ) : isIOS ? (
            /* iOS Safari Instructions */
            <div className="space-y-3">
              <p className="text-xs text-slate-300 font-medium">
                សូមអនុវត្តតាមជំហានងាយៗទាំង ៣ នេះនៅក្នុង Safari (iOS iPhone/iPad):
              </p>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex items-start gap-3 p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-[11px]">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">ចុចប៊ូតុង Share (Tap Share Button)</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      នៅខាងក្រោម Safari Toolbar <Share2 className="w-3.5 h-3.5 text-indigo-400 inline" />
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-[11px]">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">ជ្រើសរើស "Add to Home Screen"</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      អូសចុះក្រោម រួចចុចលើ <PlusSquare className="w-3.5 h-3.5 text-indigo-400 inline" /> Add to Home Screen (បន្ថែមទៅកាន់អេក្រង់ដើម)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-[11px]">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">ចុចពាក្យ "Add" នៅជ្រុងខាងស្តាំលើ</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      រួចរាល់! Icon Zevio AI នឹងបង្ហាញនៅលើអេក្រង់ទូរស័ព្ទរបស់អ្នកភ្លាមៗ។
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : deferredPrompt ? (
            /* Android / Chrome One-Tap Install */
            <div className="space-y-3 text-center">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <Smartphone className="w-8 h-8 text-indigo-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-200">
                  Install Zevio AI on your Android device
                </p>
                <p className="text-[11px] text-slate-400">
                  Get instant access from your home screen with full offline caching and full-screen experience.
                </p>
              </div>

              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30"
              >
                <Download className="w-4 h-4" />
                <span>Install to Home Screen</span>
              </button>
            </div>
          ) : (
            /* Generic instructions for other browsers */
            <div className="space-y-3 text-xs text-slate-300">
              <p>To add Zevio AI to your home screen:</p>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-[11px] text-slate-400">
                <p>1. Open your browser menu (the three dots in Chrome or browser options).</p>
                <p>2. Tap <strong>Install App</strong> or <strong>Add to Home screen</strong>.</p>
                <p>3. Confirm to place the Zevio AI icon on your phone desktop.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
          >
            បិទ (Close)
          </button>
        </div>
      </div>
    </div>
  );
};

