import { useLocation, useNavigate } from "react-router-dom";
import { Home, Users, Settings, Clock, CreditCard } from "lucide-react";

const items = [
  { icon: Home, label: "Accueil", path: "/" },
  { icon: Users, label: "Membres", path: "/membres" },
  { icon: CreditCard, label: "Paiement", path: "/paiement" },
  { icon: Clock, label: "Historique", path: "/historique" },
  { icon: Settings, label: "Paramètres", path: "/parametres" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex justify-around py-2 max-w-lg mx-auto">
        {items.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[11px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
