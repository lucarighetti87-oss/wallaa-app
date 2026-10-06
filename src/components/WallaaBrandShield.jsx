import { useEffect, useState } from 'react';
import { storage } from '../services/storage';

function isSentinelOn(state) {
  if (!state || state.active !== true) return false;
  if (state.available === false) return false;
  return String(state.status || 'available').toLowerCase() !== 'offline';
}

export default function WallaaBrandShield({ alt = 'Wallaa', ...props }) {
  const [sentinelActive, setSentinelActive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const state = await storage.getNativeSentinel();
        if (!cancelled) setSentinelActive(isSentinelOn(state));
      } catch {
        if (!cancelled) setSentinelActive(false);
      }
    };

    refresh();
    const timer = setInterval(refresh, 1000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  return (
    <img
      {...props}
      src={sentinelActive ? '/sentinel-shield.png' : '/wallaa-app-icon.png'}
      alt={alt}
      data-wallaa-brand={sentinelActive ? 'sentinel' : 'wallaa'}
    />
  );
}
