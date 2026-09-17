import { useEffect, useState } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(() => !(
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  ));

  useEffect(() => {
    const onBeforeInstall = (e) => { e.preventDefault(); setDeferredPrompt(e); setVisible(true); };
    const onAppInstalled = () => { setDeferredPrompt(null); setVisible(false); toast.success('AlkaPoint installed successfully'); };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    const timer = setTimeout(() => setVisible(true), 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  const handleClick = async () => {
    if (!deferredPrompt) {
      toast('To install: open your browser menu and choose "Install App" or "Add to Home Screen".', { icon: 'ℹ️', duration: 5000 });
      return;
    }
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') toast.success('Installing AlkaPoint…');
    else toast('Install dismissed');
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <button
      onClick={handleClick}
      className="
        fixed bottom-6 right-6 z-40
        flex items-center gap-2 pl-3 pr-4 py-2.5
        rounded-full
        bg-gradient-to-br from-gold-500 to-gold-600
        text-ink-900 font-bold text-sm
        border border-gold-300/40
        shadow-[0_10px_30px_rgba(212,162,76,0.45)]
        hover:shadow-[0_14px_40px_rgba(212,162,76,0.60)]
        hover:-translate-y-0.5 active:translate-y-0
        transition-all animate-float-y
      "
      aria-label="Install AlkaPoint app"
    >
      <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-ink-900/15">
        <ArrowDownTrayIcon className="w-4 h-4" />
      </span>
      Install AlkaPoint
    </button>
  );
}
