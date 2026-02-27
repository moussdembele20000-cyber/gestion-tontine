import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { useTontine } from "@/hooks/useTontine";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth";
import { Save, LogOut, Calendar } from "lucide-react";

export default function Parametres() {
  const { tontine, updateTontine } = useTontine();
  const { profile } = useAuth();
  const [nom, setNom] = useState("");
  const [montant, setMontant] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateProchainTour, setDateProchainTour] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (tontine) {
      setNom(tontine.nom);
      setMontant(String(tontine.montant));
      setDateDebut(tontine.date_debut || "");
      setDateProchainTour(tontine.date_prochain_tour || "");
    }
  }, [tontine]);

  const handleSave = async () => {
    const m = parseInt(montant) || 0;
    if (!nom.trim() || m <= 0) return;
    await updateTontine.mutateAsync({
      nom: nom.trim(),
      montant: m,
      date_debut: dateDebut || undefined,
      date_prochain_tour: dateProchainTour || undefined,
    } as any);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("fr-FR");
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="text-xl font-bold">Paramètres</h1>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        <div className="bg-card rounded-2xl p-5 shadow-md border border-border space-y-4">
          <h3 className="font-semibold text-lg">Paramètres de la tontine</h3>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              Nom de la tontine
            </label>
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              Montant cotisation (FCFA)
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              Date de début
            </label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date du prochain tour
            </label>
            <input
              type="date"
              value={dateProchainTour}
              onChange={(e) => setDateProchainTour(e.target.value)}
              className="input-field"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={updateTontine.isPending}
            className="btn-action bg-primary text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saved ? "Enregistré ✓" : "Enregistrer"}
          </button>
        </div>

        {/* Info utilisateur */}
        <div className="bg-card rounded-2xl p-5 shadow-md border border-border space-y-3">
          <h3 className="font-semibold text-lg">Mon compte</h3>
          <p className="text-muted-foreground">
            Téléphone : <span className="text-foreground font-medium">{profile?.telephone}</span>
          </p>
          {profile?.date_expiration && (
            <p className="text-muted-foreground">
              Abonnement expire le : <span className="text-foreground font-medium">{formatDate(profile.date_expiration)}</span>
            </p>
          )}

          <button
            onClick={signOut}
            className="btn-action bg-destructive text-destructive-foreground flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Se déconnecter
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
