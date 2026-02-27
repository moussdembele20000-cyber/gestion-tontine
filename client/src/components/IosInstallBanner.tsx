import { useState, useEffect } from "react";

export default function IosInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);

  // Détecte iOS
  const isIos = () =>
    /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());

  // Vérifie si l'app est déjà en standalone mode
  const isInStandaloneMode = () =>
    "standalone" in window.navigator && (window.navigator as any).standalone;

  useEffect(() => {
    if (isIos() && !isInStandaloneMode()) {
      setShowBanner(true);
    }
  }, []);

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-[90%] max-w-md bg-white border border-gray-300 rounded-xl shadow-lg p-4 flex items-center justify-between z-50">
      <div className="text-gray-800 text-sm">
        Pour installer l'application, cliquez sur le bouton{" "}
        <span className="font-bold">Partager</span> puis{" "}
        <span className="font-bold">Ajouter à l’écran d’accueil</span>
      </div>
      <button
        className="ml-4 px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600"
        onClick={() => setShowBanner(false)}
      >
        OK
      </button>
    </div>
  );
}