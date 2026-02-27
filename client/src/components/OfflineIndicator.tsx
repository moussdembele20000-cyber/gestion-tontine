import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

export default function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);
  const [showReconnect, setShowReconnect] = useState(false);

  useEffect(() => {
    const goOffline = () => setOnline(false);
    const goOnline = () => {
      setOnline(true);
      setShowReconnect(true);
      setTimeout(() => setShowReconnect(false), 3000);
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online && !showReconnect) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-[100] py-2 px-4 text-center text-sm font-medium transition-all ${
      online
        ? "bg-success text-success-foreground"
        : "bg-destructive text-destructive-foreground"
    }`}>
      <div className="flex items-center justify-center gap-2">
        {online ? (
          <>
            <Wifi className="w-4 h-4" />
            Synchronisation en cours...
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            Mode hors ligne
          </>
        )}
      </div>
    </div>
  );
}
