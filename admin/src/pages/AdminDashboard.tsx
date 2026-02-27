import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users, UserCheck, UserX, LogOut, Shield, ToggleLeft, ToggleRight,
  Trash2, Clock, CalendarPlus, CheckCircle2, Bell, BellRing, Eye,
  ArrowLeft, Volume2, VolumeX, SendHorizonal
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function useAdminAlerts(qc: any) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [alerts, setAlerts] = useState<{ id: string; type: string; message: string; time: Date }[]>([]);
  const ctxRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback((freq = 880) => {
    if (!soundEnabled) return;
    try {
      if (!ctxRef.current || ctxRef.current.state === "closed") {
        ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }, [soundEnabled]);

  useEffect(() => {
    // Listen for new profiles (new user)
    const profileChannel = supabase
      .channel('admin-profiles-rt2')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
        const p = payload.new as any;
        setAlerts(a => [{ id: crypto.randomUUID(), type: 'user', message: `👤 Nouvel utilisateur : ${p.telephone}`, time: new Date() }, ...a.slice(0, 29)]);
        playBeep(880);
        qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
        qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'profiles' }, () => {
        qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      })
      .subscribe();

    // Listen for new payments
    const paiementChannel = supabase
      .channel('admin-paiements-rt2')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'paiements' }, (payload) => {
        const p = payload.new as any;
        setAlerts(a => [{ id: crypto.randomUUID(), type: 'payment', message: `💳 Nouveau paiement : ${(p.montant || 0).toLocaleString()} FCFA · Réf: ${p.reference || '—'}`, time: new Date() }, ...a.slice(0, 29)]);
        playBeep(660);
        qc.invalidateQueries({ queryKey: ["admin-paiements"] });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'paiements' }, () => {
        qc.invalidateQueries({ queryKey: ["admin-paiements"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(paiementChannel);
    };
  }, [playBeep, qc]);

  return { alerts, soundEnabled, setSoundEnabled, setAlerts };
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [prolongDays, setProlongDays] = useState(30);
  const [detailUser, setDetailUser] = useState<any>(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const { alerts, soundEnabled, setSoundEnabled } = useAdminAlerts(qc);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("date_creation", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: paiements } = useQuery({
    queryKey: ["admin-paiements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paiements")
        .select("*")
        .order("date_paiement", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Detail data
  const { data: detailTontines } = useQuery({
    queryKey: ["admin-detail-tontines", detailUser?.user_id],
    queryFn: async () => {
      const { data } = await supabase.from("tontines").select("*").eq("user_id", detailUser!.user_id);
      return data || [];
    },
    enabled: !!detailUser,
  });

  const { data: detailMembres } = useQuery({
    queryKey: ["admin-detail-membres", detailTontines?.[0]?.id],
    queryFn: async () => {
      if (!detailTontines?.[0]) return [];
      const { data } = await supabase.from("membres").select("*").eq("tontine_id", detailTontines[0].id).order("ordre");
      return data || [];
    },
    enabled: !!detailTontines?.[0],
  });

  const { data: detailHistorique } = useQuery({
    queryKey: ["admin-detail-historique", detailTontines?.[0]?.id],
    queryFn: async () => {
      if (!detailTontines?.[0]) return [];
      const { data } = await supabase.from("historique").select("*").eq("tontine_id", detailTontines[0].id).order("numero_tour");
      return data || [];
    },
    enabled: !!detailTontines?.[0],
  });

  const { data: detailPaiements } = useQuery({
    queryKey: ["admin-detail-paiements", detailUser?.user_id],
    queryFn: async () => {
      const { data } = await supabase.from("paiements").select("*").eq("user_id", detailUser!.user_id).order("date_paiement", { ascending: false });
      return data || [];
    },
    enabled: !!detailUser,
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ userId, newStatus }: { userId: string; newStatus: string }) => {
      const { error } = await supabase.from("profiles").update({ statut: newStatus }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-profiles"] }),
  });

  const prolongAbonnement = useMutation({
    mutationFn: async ({ userId, days }: { userId: string; days: number }) => {
      const profile = allProfiles.find(p => p.user_id === userId);
      const baseDate = profile?.date_expiration && new Date(profile.date_expiration) > new Date()
        ? new Date(profile.date_expiration) : new Date();
      const newDate = new Date(baseDate);
      newDate.setDate(newDate.getDate() + days);
      const { error } = await supabase.from("profiles").update({
        date_expiration: newDate.toISOString(), abonnement_actif: true, statut: "actif",
      }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-profiles"] }); setSelectedUser(null); },
  });

  const validatePaiement = useMutation({
    mutationFn: async ({ paiementId, userId }: { paiementId: string; userId: string }) => {
      // Validate payment
      const { error } = await supabase.from("paiements").update({ valide_par_admin: true }).eq("id", paiementId);
      if (error) throw error;
      // Auto-extend 30 days and activate
      const profile = allProfiles.find(p => p.user_id === userId);
      const baseDate = profile?.date_expiration && new Date(profile.date_expiration) > new Date()
        ? new Date(profile.date_expiration) : new Date();
      const newDate = new Date(baseDate);
      newDate.setDate(newDate.getDate() + 30);
      await supabase.from("profiles").update({
        date_expiration: newDate.toISOString(), abonnement_actif: true, statut: "actif",
      }).eq("user_id", userId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-paiements"] });
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
  });

  // Bouton Relancer le paiement: envoie une alerte en temps réel à l'utilisateur
  const relancerPaiement = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("payment_alerts").insert({
        user_id: userId,
        message: "Paiement requis — veuillez régulariser votre accès",
      });
      if (error) throw error;
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      // Delete all user data (cascade)
      await supabase.from("historique").delete().eq("user_id", userId);
      await supabase.from("membres").delete().eq("user_id", userId);
      await supabase.from("tontines").delete().eq("user_id", userId);
      await supabase.from("paiements").delete().eq("user_id", userId);
      await supabase.from("payment_alerts").delete().eq("user_id", userId);
      const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-profiles"] }),
  });

  const handleDelete = (userId: string, phone: string) => {
    if (!confirm(`Supprimer l'utilisateur ${phone} et toutes ses données ? Cette action est irréversible.`)) return;
    deleteUser.mutate(userId);
  };

  const allProfiles = profiles || [];
  const allPaiements = paiements || [];
  const activeCount = allProfiles.filter((p) => p.statut === "actif").length;
  const blockedCount = allProfiles.filter((p) => p.statut === "bloque").length;
  const expiredCount = allProfiles.filter((p) => p.date_expiration && new Date(p.date_expiration) < new Date()).length;
  const pendingPaiements = allPaiements.filter((p) => !p.valide_par_admin);
  const monthlyRevenue = allPaiements.filter(p => p.valide_par_admin && new Date(p.date_paiement).getMonth() === new Date().getMonth()).reduce((s, p) => s + (p.montant as number), 0);

  const isExpired = (dateExp: string | null) => dateExp ? new Date(dateExp) < new Date() : false;
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("fr-FR") : "—";

  // Detail view
  if (detailUser) {
    const tontine = detailTontines?.[0];
    return (
      <div className="page-container max-w-lg mx-auto pb-8">
        <div className="page-header">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => setDetailUser(null)} className="p-2 rounded-lg bg-primary-foreground/10">
              <ArrowLeft className="w-5 h-5 text-primary-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Détails utilisateur</h1>
              <p className="text-sm opacity-80">{detailUser.telephone}</p>
            </div>
          </div>
        </div>
        <div className="px-4 -mt-4 space-y-4">
          <div className="bg-card rounded-2xl p-4 shadow-sm border border-border space-y-2">
            <p className="text-sm"><span className="text-muted-foreground">Inscrit :</span> {formatDate(detailUser.date_creation)}</p>
            <p className="text-sm"><span className="text-muted-foreground">Expiration :</span> {formatDate(detailUser.date_expiration)}</p>
            <p className="text-sm"><span className="text-muted-foreground">Statut :</span> <span className={detailUser.statut === "actif" ? "text-success font-semibold" : "text-destructive font-semibold"}>{detailUser.statut}</span></p>
            {tontine && (
              <>
                <p className="text-sm"><span className="text-muted-foreground">Tontine :</span> {tontine.nom}</p>
                <p className="text-sm"><span className="text-muted-foreground">Cotisation :</span> {(tontine.montant as number).toLocaleString()} FCFA</p>
                <p className="text-sm"><span className="text-muted-foreground">Tours effectués :</span> {tontine.index_tour_actuel}</p>
              </>
            )}
          </div>

          <h3 className="font-bold">Membres ({detailMembres?.length || 0})</h3>
          {(detailMembres || []).map(m => (
            <div key={m.id} className="bg-card rounded-xl p-3 shadow-sm border border-border flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{m.ordre}</div>
              <div><p className="font-semibold text-sm">{m.nom}</p>{m.telephone && <p className="text-xs text-muted-foreground">{m.telephone}</p>}</div>
            </div>
          ))}

          <h3 className="font-bold">Historique tours ({detailHistorique?.length || 0})</h3>
          {(detailHistorique || []).map(h => (
            <div key={h.id} className="bg-card rounded-xl p-3 shadow-sm border border-border flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center text-success font-bold text-sm">#{h.numero_tour}</div>
              <div className="flex-1"><p className="font-semibold text-sm">{h.nom_membre}</p><p className="text-xs text-muted-foreground">{formatDate(h.date)}</p></div>
              <p className="text-sm font-bold">{(h.montant as number).toLocaleString()} FCFA</p>
            </div>
          ))}

          <h3 className="font-bold">Paiements ({detailPaiements?.length || 0})</h3>
          {(detailPaiements || []).map(p => (
            <div key={p.id} className="bg-card rounded-xl p-3 shadow-sm border border-border flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${p.valide_par_admin ? "bg-success/10" : "bg-warning/10"}`}>
                {p.valide_par_admin ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Clock className="w-4 h-4 text-warning" />}
              </div>
              <div className="flex-1"><p className="font-semibold text-sm">{(p.montant as number).toLocaleString()} FCFA</p><p className="text-xs text-muted-foreground">{formatDate(p.date_paiement)} · Réf: {p.reference || "—"}</p></div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${p.valide_par_admin ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{p.valide_par_admin ? "Validé" : "Attente"}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container max-w-lg mx-auto pb-8">
      <div className="page-header">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6" />
            <h1 className="text-xl font-bold">Admin TOUR</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 rounded-lg bg-primary-foreground/10">
              {soundEnabled ? <Volume2 className="w-5 h-5 text-primary-foreground" /> : <VolumeX className="w-5 h-5 text-primary-foreground" />}
            </button>
            <button onClick={() => setShowAlerts(!showAlerts)} className="p-2 rounded-lg bg-primary-foreground/10 relative">
              {alerts.length > 0 ? <BellRing className="w-5 h-5 text-primary-foreground animate-bounce" /> : <Bell className="w-5 h-5 text-primary-foreground" />}
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[10px] text-white flex items-center justify-center">
                  {alerts.length > 9 ? "9+" : alerts.length}
                </span>
              )}
            </button>
            <button onClick={signOut} className="p-2 rounded-lg bg-primary-foreground/10">
              <LogOut className="w-5 h-5 text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Alerts panel */}
        {showAlerts && alerts.length > 0 && (
          <div className="bg-card rounded-2xl p-4 shadow-md border border-border space-y-2 max-h-60 overflow-y-auto">
            <h3 className="font-bold text-sm flex items-center gap-2"><BellRing className="w-4 h-4 text-primary" /> Notifications en temps réel</h3>
            {alerts.map(a => (
              <div key={a.id} className={`text-xs p-2 rounded-lg ${a.type === 'user' ? 'bg-primary/5' : 'bg-warning/5'}`}>
                <p className="font-medium">{a.message}</p>
                <p className="text-muted-foreground">{a.time.toLocaleTimeString("fr-FR")}</p>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-card text-center">
            <Users className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{allProfiles.length}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div className="stat-card text-center">
            <UserCheck className="w-5 h-5 text-success mx-auto mb-1" />
            <p className="text-2xl font-bold">{activeCount}</p>
            <p className="text-[10px] text-muted-foreground">Actifs</p>
          </div>
          <div className="stat-card text-center">
            <UserX className="w-5 h-5 text-destructive mx-auto mb-1" />
            <p className="text-2xl font-bold">{blockedCount}</p>
            <p className="text-[10px] text-muted-foreground">Bloqués</p>
          </div>
          <div className="stat-card text-center">
            <Clock className="w-5 h-5 text-warning mx-auto mb-1" />
            <p className="text-2xl font-bold">{expiredCount}</p>
            <p className="text-[10px] text-muted-foreground">Expirés</p>
          </div>
        </div>

        {/* Revenue */}
        <div className="stat-card text-center">
          <p className="text-xs text-muted-foreground">Revenus du mois</p>
          <p className="text-2xl font-bold text-primary">{monthlyRevenue.toLocaleString()} FCFA</p>
        </div>

        {/* Pending payments */}
        {pendingPaiements.length > 0 && (
          <>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning animate-pulse inline-block" />
              Paiements en attente ({pendingPaiements.length})
            </h2>
            {pendingPaiements.map((p) => {
              const profile = allProfiles.find(pr => pr.user_id === p.user_id);
              return (
                <div key={p.id} className="bg-card rounded-xl p-4 shadow-sm border border-warning/30">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold">{profile?.telephone || "Inconnu"}</p>
                      <p className="text-xs text-muted-foreground">
                        {(p.montant as number).toLocaleString()} FCFA · {formatDate(p.date_paiement)}
                      </p>
                      {p.reference && <p className="text-xs font-medium text-primary">Réf: {p.reference}</p>}
                    </div>
                    <button
                      onClick={() => validatePaiement.mutate({ paiementId: p.id, userId: p.user_id })}
                      disabled={validatePaiement.isPending}
                      className="py-2 px-3 rounded-lg text-sm bg-success/10 text-success font-medium flex items-center gap-1 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Valider
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* User list */}
        <h2 className="font-bold text-lg">Utilisateurs ({allProfiles.filter(p => p.user_id !== user?.id).length})</h2>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : (
          allProfiles
            .filter((p) => p.user_id !== user?.id)
            .map((p) => (
              <div key={p.id} className="bg-card rounded-xl p-4 shadow-sm border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold">{p.telephone}</p>
                    <p className="text-xs text-muted-foreground">
                      Inscrit le {formatDate(p.date_creation)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expire le {formatDate(p.date_expiration)}
                      {isExpired(p.date_expiration) && (
                        <span className="text-destructive font-semibold ml-1">· Expiré</span>
                      )}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    p.statut === "actif" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  }`}>
                    {p.statut === "actif" ? "Actif" : "Bloqué"}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => toggleStatus.mutate({ userId: p.user_id, newStatus: p.statut === "actif" ? "bloque" : "actif" })}
                    disabled={toggleStatus.isPending}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                      p.statut === "actif" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                    }`}
                  >
                    {p.statut === "actif" ? <><ToggleLeft className="w-4 h-4" /> Bloquer</> : <><ToggleRight className="w-4 h-4" /> Activer</>}
                  </button>
                  {/* Bouton Relancer le paiement */}
                  <button
                    onClick={() => relancerPaiement.mutate(p.user_id)}
                    disabled={relancerPaiement.isPending}
                    title="Relancer le paiement"
                    className="py-2 px-3 rounded-lg text-sm bg-warning/10 text-warning font-medium flex items-center gap-1 disabled:opacity-50"
                  >
                    <SendHorizonal className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDetailUser(p)} className="py-2 px-3 rounded-lg text-sm bg-primary/10 text-primary font-medium">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => setSelectedUser(p)} className="py-2 px-3 rounded-lg text-sm bg-primary/10 text-primary font-medium">
                    <CalendarPlus className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(p.user_id, p.telephone)} className="py-2 px-3 rounded-lg text-sm bg-destructive/10 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Prolong subscription dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-xs mx-auto">
          <DialogHeader>
            <DialogTitle>Prolonger l'abonnement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Utilisateur : <span className="font-semibold">{selectedUser?.telephone}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Expire le : {formatDate(selectedUser?.date_expiration)}
            </p>
            <div>
              <label className="text-sm font-medium">Nombre de jours</label>
              <input
                type="number"
                value={prolongDays}
                onChange={(e) => setProlongDays(Number(e.target.value))}
                min={1}
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
              />
            </div>
            <button
              onClick={() => prolongAbonnement.mutate({ userId: selectedUser?.user_id, days: prolongDays })}
              disabled={prolongAbonnement.isPending}
              className="btn-action bg-primary text-primary-foreground w-full"
            >
              {prolongAbonnement.isPending ? "En cours..." : `Prolonger de ${prolongDays} jours`}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
