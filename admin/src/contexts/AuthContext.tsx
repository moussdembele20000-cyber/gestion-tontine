import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUserRole, getUserProfile } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  role: string;
  profile: any;
  loading: boolean;
  blocked: boolean;
  deleted: boolean; // compte supprimé par admin
  paymentAlert: boolean;
  forceRedirectTo: string | null; // navigation forcée
}

interface AuthContextType extends AuthState {
  refreshProfile: () => Promise<void>;
  dismissPaymentAlert: () => void;
  clearForceRedirect: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: "user",
    profile: null,
    loading: true,
    blocked: false,
    deleted: false,
    paymentAlert: false,
    forceRedirectTo: null,
  });

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const alertChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadUserData = useCallback(async (user: User) => {
    try {
      const [role, profile] = await Promise.all([
        getUserRole(user.id),
        getUserProfile(user.id),
      ]);
      const blocked = profile?.statut === "bloque";
      // Ne pas déconnecter — garder la session pour afficher /paiement
      setState({ user, role, profile, loading: false, blocked, deleted: false, paymentAlert: false, forceRedirectTo: null });
    } catch (err) {
      console.error("Error loading user data:", err);
      setState({ user, role: "user", profile: null, loading: false, blocked: false, deleted: false, paymentAlert: false, forceRedirectTo: null });
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (state.user) {
      try {
        const profile = await getUserProfile(state.user.id);
        const blocked = profile?.statut === "bloque";
        setState((s) => ({ ...s, profile, blocked }));
      } catch (err) {
        console.error("Error refreshing profile:", err);
      }
    }
  }, [state.user]);

  const dismissPaymentAlert = useCallback(() => {
    setState((s) => ({ ...s, paymentAlert: false }));
  }, []);

  const clearForceRedirect = useCallback(() => {
    setState((s) => ({ ...s, forceRedirectTo: null }));
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        loadUserData(session.user);
      } else {
        setState((s) => ({ ...s, loading: false }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        if (session?.user) {
          setTimeout(() => {
            if (mounted) loadUserData(session.user);
          }, 0);
        } else {
          setState({ user: null, role: "user", profile: null, loading: false, blocked: false, deleted: false, paymentAlert: false, forceRedirectTo: null });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  // ─── Realtime : écoute les changements de profil (blocage/déblocage/suppression)
  useEffect(() => {
    if (!state.user) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`profile-rt-${state.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${state.user.id}`,
        },
        (payload) => {
          const newProfile = payload.new as any;
          const blocked = newProfile?.statut === "bloque";

          setState((s) => ({
            ...s,
            profile: newProfile,
            blocked,
            // Si déblocage (était bloqué et maintenant actif) → rediriger vers /
            forceRedirectTo: !blocked && s.blocked ? "/" : s.forceRedirectTo,
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${state.user.id}`,
        },
        () => {
          // Compte supprimé par l'admin → déconnexion immédiate
          setState((s) => ({ ...s, deleted: true }));
          supabase.auth.signOut();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'paiements',
          filter: `user_id=eq.${state.user.id}`,
        },
        async (payload) => {
          const p = payload.new as any;
          // Paiement validé → rafraîchir le profil et rediriger vers dashboard
          if (p.valide_par_admin) {
            const profile = await getUserProfile(state.user!.id);
            if (profile) {
              const blocked = profile.statut === "bloque";
              setState((s) => ({
                ...s,
                profile,
                blocked,
                // Si le profil est maintenant actif → aller au dashboard
                forceRedirectTo: !blocked ? "/" : s.forceRedirectTo,
              }));
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.user?.id]);

  // ─── Realtime : alertes de relance paiement
  useEffect(() => {
    if (!state.user || state.role === "super_admin") return;

    if (alertChannelRef.current) {
      supabase.removeChannel(alertChannelRef.current);
    }

    const alertChannel = supabase
      .channel(`payment-alerts-${state.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payment_alerts',
          filter: `user_id=eq.${state.user.id}`,
        },
        () => {
          setState((s) => ({ ...s, paymentAlert: true }));
        }
      )
      .subscribe();

    alertChannelRef.current = alertChannel;

    return () => {
      supabase.removeChannel(alertChannel);
      alertChannelRef.current = null;
    };
  }, [state.user?.id, state.role]);

  return (
    <AuthContext.Provider value={{ ...state, refreshProfile, dismissPaymentAlert, clearForceRedirect }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
