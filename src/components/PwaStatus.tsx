import { useEffect, useState } from 'react';
import './PwaStatus.css';

/** Small, dismissible status affordance for staff using the installed PWA. */
export default function PwaStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onInstall = (event: Event) => { event.preventDefault(); setInstallEvent(event as BeforeInstallPromptEvent); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeinstallprompt', onInstall);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); window.removeEventListener('beforeinstallprompt', onInstall); };
  }, []);

  if (dismissed) return null;
  if (!online) return <div className="pwaStatus offline" role="status">Offline — changes need a connection to sync <button onClick={() => setDismissed(true)} aria-label="Dismiss offline message">×</button></div>;
  if (!installEvent) return null;
  return <div className="pwaStatus" role="status"><span>Install Staff Workspace for quicker access</span><button onClick={async () => { await installEvent.prompt(); setInstallEvent(null); }}>Install</button><button onClick={() => setDismissed(true)} aria-label="Dismiss install message">×</button></div>;
}

interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; }
