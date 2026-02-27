import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, CheckCircle2, Send, Receipt, Clock, Phone, LogOut, AlertTriangle, Lock, Bell } from "lucide-react";

export default function Paiement() {
  const { user, profile, blocked, paymentAlert, dismissPaymentAlert } = useAuth();
  const qc = useQueryClient();
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const isBlocked = blocked || profile?.statut === "bloque";
  const isExpired = profile?.date_expiration && new Date(profile.date_expiration) < new Date();
  const isForced = isBlocked || isExpired;

  // Realtime: listen for payment validation to auto-refresh
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`paiement-user-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'paiements',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["mes-paiements", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  const { data: paiements } = useQuery({
    queryKey: ["mes-paiements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paiements")
        .select("*")
        .eq("user_id", user!.id)
        .order("date_paiement", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!reference.trim()) {
      setError("Veuillez entrer la référence de paiement.");
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.from("paiements").insert({
        user_id: user!.id,
        montant: 700,
        reference: reference.trim(),
      });
      if (err) throw err;
      setSuccess(true);
      setReference("");
      qc.invalidateQueries({ queryKey: ["mes-paiements", user!.id] });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("fr-FR");
  };

  const mesPaiements = paiements || [];

  const content = (
    <div className="space-y-4">
      {/* Signal clignotant de relance paiement */}
      {paymentAlert && (
        <div
          className="rounded-2xl p-4 border-2 border-destructive bg-destructive/10 animate-pulse cursor-pointer"
          onClick={() => {
            dismissPaymentAlert();
            // Scroll to form
            document.getElementById("payment-form")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-destructive animate-bounce" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-destructive text-sm">⚠️ Paiement requis</p>
              <p className="text-xs text-muted-foreground">Veuillez régulariser votre accès — Cliquez pour payer</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); dismissPaymentAlert(); }}
              className="text-xs text-muted-foreground underline"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Block/Expire banner */}
      {isForced && (
        <div className={`rounded-2xl p-5 text-center border-2 ${
          isBlocked 
            ? "bg-destructive/10 border-destructive/30" 
            : "bg-warning/10 border-warning/30"
        }`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
            isBlocked ? "bg-destructive/20" : "bg-warning/20"
          }`}>
            {isBlocked ? (
              <Lock className="w-8 h-8 text-destructive" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-warning" />
            )}
          </div>
          <h2 className="text-lg font-bold mb-1">
            {isBlocked ? "Compte bloqué par l'administrateur" : "Abonnement expiré"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isBlocked 
              ? "Votre compte a été bloqué. Effectuez un paiement pour le réactiver."
              : "Votre abonnement a expiré. Renouvelez votre accès."}
          </p>
        </div>
      )}

      {/* Payment info */}
      <div className="bg-card rounded-2xl p-5 shadow-md border border-border text-center">
        <CreditCard className="w-10 h-10 text-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-1">Numéro Mobile Money Wave</p>
        <p className="text-xl font-bold text-primary flex items-center justify-center gap-2">
          <Phone className="w-5 h-5" />
          +2250758127736
        </p>
        <div className="mt-4 bg-primary/5 rounded-xl p-3 border border-primary/20">
          <p className="text-sm font-semibold">TOUR : 700 FCFA / 30 jours</p>
        </div>
        {profile?.date_expiration && (
          <p className="text-xs text-muted-foreground mt-2">
            Expire le : {formatDate(profile.date_expiration)}
          </p>
        )}
      </div>

      {success ? (
        <div className="bg-success/10 rounded-2xl p-6 text-center border border-success/20 animate-fade-in">
          <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
          <p className="font-bold text-lg">Paiement soumis !</p>
          <p className="text-sm text-muted-foreground mt-1">
            En attente de validation par l'administrateur.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Votre accès sera rétabli automatiquement après validation.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="mt-4 text-sm text-primary font-semibold"
          >
            Soumettre un autre paiement
          </button>
        </div>
      ) : (
        <form id="payment-form" onSubmit={handleSubmit} className="bg-card rounded-2xl p-5 shadow-md border border-border space-y-4">
          <h3 className="font-semibold">Soumettre un paiement</h3>

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              Référence Mobile Money
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ex: TXN123456789"
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-action bg-primary text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
            {loading ? "Envoi en cours..." : "Soumettre paiement"}
          </button>
        </form>
      )}

      {/* Statut en attente */}
      {mesPaiements.filter(p => !p.valide_par_admin).length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-warning flex-shrink-0" />
          <p className="text-sm font-medium">Statut : En attente de validation</p>
        </div>
      )}

      {/* Historique des paiements */}
      {mesPaiements.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Mes reçus de paiement
          </h3>
          {mesPaiements.map((p) => (
            <div key={p.id} className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                p.valide_par_admin ? "bg-success/10" : "bg-warning/10"
              }`}>
                {p.valide_par_admin ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <Clock className="w-5 h-5 text-warning" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{(p.montant as number).toLocaleString()} FCFA</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(p.date_paiement)} · Réf: {p.reference || "—"}
                </p>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                p.valide_par_admin
                  ? "bg-success/10 text-success"
                  : "bg-warning/10 text-warning"
              }`}>
                {p.valide_par_admin ? "Validé ✓" : "En attente"}
              </span>
            </div>
          ))}
        </div>
      )}

      {isForced && (
        <button
          onClick={signOut}
          className="btn-action bg-muted text-foreground flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Se déconnecter
        </button>
      )}
    </div>
  );

  if (isForced) {
    return (
      <div className="page-container max-w-lg mx-auto pb-8">
        <div className="page-header">
          <h1 className="text-xl font-bold">Paiement obligatoire</h1>
        </div>
        <div className="px-4 -mt-4">
          {content}
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="text-xl font-bold">Paiement</h1>
      </div>
      <div className="px-4 -mt-4">
        {content}
      </div>
    </AppLayout>
  );
}
