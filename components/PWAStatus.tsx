import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const PWAStatus: React.FC = () => {
  const [showOfflineReady, setShowOfflineReady] = useState(false);
  const [showUpdateReady, setShowUpdateReady] = useState(false);
  const [hasDismissedUpdate, setHasDismissedUpdate] = useState(false);
  const [hasDismissedOffline, setHasDismissedOffline] = useState(false);

  const {
    offlineReady,
    needRefresh,
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisterError(error) {
      console.error('Service worker registration failed', error);
    },
  });

  useEffect(() => {
    if (offlineReady) {
      if (!hasDismissedOffline) {
        setShowOfflineReady(true);
      }
    } else {
      setShowOfflineReady(false);
      setHasDismissedOffline(false);
    }
  }, [offlineReady, hasDismissedOffline]);

  useEffect(() => {
    if (needRefresh) {
      if (!hasDismissedUpdate) {
        setShowUpdateReady(true);
      }
    } else {
      setShowUpdateReady(false);
      setHasDismissedUpdate(false);
    }
  }, [needRefresh, hasDismissedUpdate]);

  const handleReload = async () => {
    setHasDismissedUpdate(true);
    setShowUpdateReady(false);
    try {
      await updateServiceWorker(true);
    } catch (error) {
      console.error('Service worker update failed', error);
    }
  };

  const handleDismissUpdate = () => {
    setHasDismissedUpdate(true);
    setShowUpdateReady(false);
  };

  const handleDismissOffline = () => {
    setHasDismissedOffline(true);
    setShowOfflineReady(false);
  };

  if (!showOfflineReady && !showUpdateReady) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 pointer-events-none">
      <div className="w-full max-w-md space-y-3 pointer-events-auto">
        {showUpdateReady && (
          <div className="flex items-start justify-between gap-3 rounded-xl bg-charcoal text-white dark:bg-charcoal-dark shadow-card border border-white/10 px-4 py-3">
            <div>
              <p className="font-semibold">Update ready</p>
              <p className="text-sm text-white/80">Reload to get the latest version of Nota.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold transition hover:bg-white/25"
                onClick={handleDismissUpdate}
              >
                Dismiss
              </button>
              <button
                className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold transition hover:bg-accent/90"
                onClick={handleReload}
              >
                Reload
              </button>
            </div>
          </div>
        )}

        {showOfflineReady && (
          <div className="flex items-start justify-between gap-3 rounded-xl bg-white text-charcoal shadow-card border border-charcoal/10 px-4 py-3 dark:bg-charcoal-dark dark:text-text-dark dark:border-white/10">
            <div>
              <p className="font-semibold">Offline ready</p>
              <p className="text-sm text-charcoal/70 dark:text-text-dark/70">
                You can keep working even without a connection.
              </p>
            </div>
            <button
              className="self-center text-sm font-semibold text-accent transition hover:text-accent/80"
              onClick={handleDismissOffline}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PWAStatus;

