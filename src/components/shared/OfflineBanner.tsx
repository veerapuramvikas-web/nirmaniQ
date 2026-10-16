import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: '#78350f',
      color: 'white',
      padding: '10px 20px',
      fontSize: '0.875rem',
      fontWeight: 600,
    }}>
      <WifiOff size={16} />
      You're offline — viewing cached data. Changes will sync when you reconnect.
    </div>
  );
}
