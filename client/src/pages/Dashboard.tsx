import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTontine, useMembres, useLancerTour } from "@/hooks/useTontine";
import { signOut } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import CountdownRing from "@/components/CountdownRing";
import { LogOut, Play, Users, Coins, ArrowRight, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function Dashboard() {
  const { profile } = useAuth();
  const { tontine, loading } = useTontine();
  const { membres } = useMembres();
  const lancerTour = useLancerTour();
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastBeneficiaire, setLastBeneficiaire] = useState("");
  const [showProcessing, setShowProcessing] = useState(false);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  const totalParTour = (tontine?.montant || 0) * membres.length;
  const currentIndex = (tontine?.index_tour_actuel || 0) % Math.max(membres.length, 1);
  const prochainBeneficiaire = membres[currentIndex];

  const isTourDay = tontine?.date_prochain_tour && new Date(tontine.date_prochain_tour).setHours(8, 0, 0, 0) <= Date.now();

  const handleLancerTour = async () => {
    if (membres.length === 0) return;
    if (!confirm(`Lancer le tour pour ${prochainBeneficiaire?.nom} ?\nMontant : ${totalParTour.toLocaleString()} FCFA`)) return;
    try {
      setLastBeneficiaire(prochainBeneficiaire?.nom || "");
      setShowProcessing(true);
      // 3 second processing animation
      await new Promise((r) => setTimeout(r, 3000));
      await lancerTour.mutateAsync();
      setShowProcessing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setShowProcessing(false);
      alert(err.message);
    }
  };

  const formatFCFA = (n: number) => `${n.toLocaleString()} FCFA`;

  return (
    <AppLayout>
      <div className="page-header">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">TOUR</h1>
            <p className="text-sm opacity-80">Bonjour 👋</p>
          </div>
          <button onClick={signOut} className="p-2 rounded-lg bg-primary-foreground/10">
            <LogOut className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Nom tontine */}
        <div className="bg-card rounded-2xl p-5 shadow-md border border-border">
          <h2 className="text-lg font-bold mb-1">{tontine?.nom || "Ma Tontine"}</h2>
          <p className="text-muted-foreground text-sm">
            Cotisation : {formatFCFA(tontine?.montant || 0)}
          </p>
        </div>

        {/* Countdown Ring */}
        {tontine?.date_prochain_tour && membres.length > 0 && (
          <CountdownRing
            targetDate={tontine.date_prochain_tour}
            beneficiaireName={prochainBeneficiaire?.nom || ""}
            montant={totalParTour}
          />
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-card">
            <Users className="w-5 h-5 text-primary mb-2" />
            <p className="text-2xl font-bold">{membres.length}</p>
            <p className="text-xs text-muted-foreground">Membres</p>
          </div>
          <div className="stat-card">
            <Coins className="w-5 h-5 text-secondary mb-2" />
            <p className="text-2xl font-bold">{formatFCFA(totalParTour)}</p>
            <p className="text-xs text-muted-foreground">Total par tour</p>
          </div>
        </div>

        {/* Prochain bénéficiaire */}
        {membres.length > 0 && (
          <div className="bg-primary/5 rounded-2xl p-4 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">Prochain bénéficiaire</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">{prochainBeneficiaire?.nom}</p>
                <p className="text-sm text-muted-foreground">
                  Tour #{(tontine?.index_tour_actuel || 0) + 1} · Ordre {prochainBeneficiaire?.ordre}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-primary" />
            </div>
          </div>
        )}

        {/* Bouton lancer tour */}
        <button
          onClick={handleLancerTour}
          disabled={membres.length === 0 || lancerTour.isPending || showProcessing}
          className="btn-action bg-primary text-primary-foreground flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <Play className="w-6 h-6" />
          {showProcessing ? "En cours..." : "Lancer le tour"}
        </button>

        {membres.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Ajoutez des membres pour commencer les tours.
          </p>
        )}
      </div>

      {/* Processing animation */}
      <Dialog open={showProcessing} onOpenChange={() => {}}>
        <DialogContent className="flex flex-col items-center justify-center gap-4 py-10 text-center max-w-xs mx-auto">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Traitement du tour...</p>
        </DialogContent>
      </Dialog>

      {/* Success animation */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="flex flex-col items-center justify-center gap-4 py-10 text-center max-w-xs mx-auto">
          <div className="animate-scale-in">
            <CheckCircle2 className="w-20 h-20 text-primary" />
          </div>
          <div className="animate-fade-in">
            <p className="text-sm text-muted-foreground mb-1">Tour lancé avec succès !</p>
            <p className="text-3xl font-bold text-primary">{lastBeneficiaire}</p>
            <p className="text-sm text-muted-foreground mt-2">a reçu {formatFCFA(totalParTour)}</p>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
