import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { isSubscriptionExpired } from "@/lib/auth";
import { useEffect } from "react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Membres from "./pages/Membres";
import Historique from "./pages/Historique";
import Parametres from "./pages/Parametres";
import Paiement from "./pages/Paiement";
import NotFound from "./pages/NotFound";
import OfflineIndicator from "./components/OfflineIndicator";
import IosInstallBanner from "./components/IosInstallBanner"; // ← import du bandeau iOS

const queryClient = new QueryClient();

function ClientRoutes() {
  const { user, profile, loading, blocked } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/connexion" element={<Login />} />
        <Route path="/inscription" element={<Register />} />
        <Route path="*" element={<Navigate to="/connexion" replace />} />
      </Routes>
    );
  }

  if (blocked || isSubscriptionExpired(profile)) {
    return (
      <Routes>
        <Route path="/paiement" element={<Paiement />} />
        <Route path="*" element={<Navigate to="/paiement" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/membres" element={<Membres />} />
      <Route path="/historique" element={<Historique />} />
      <Route path="/parametres" element={<Parametres />} />
      <Route path="/paiement" element={<Paiement />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <OfflineIndicator />
          <ClientRoutes />
          <IosInstallBanner /> {/* ← bandeau iOS ajouté */}
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;