import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useTontine() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const tontineQuery = useQuery({
    queryKey: ["tontine", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tontines")
        .select("*")
        .eq("user_id", user!.id)
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateTontine = useMutation({
    mutationFn: async (updates: { nom?: string; montant?: number; date_debut?: string; date_prochain_tour?: string }) => {
      const { error } = await supabase
        .from("tontines")
        .update(updates)
        .eq("id", tontineQuery.data!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tontine"] }),
  });

  return { tontine: tontineQuery.data, loading: tontineQuery.isLoading, updateTontine };
}

export function useMembres() {
  const { user } = useAuth();
  const { tontine } = useTontine();
  const qc = useQueryClient();

  const membresQuery = useQuery({
    queryKey: ["membres", tontine?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membres")
        .select("*")
        .eq("tontine_id", tontine!.id)
        .order("ordre", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!tontine,
  });

  const addMembre = useMutation({
    mutationFn: async ({ nom, telephone }: { nom: string; telephone?: string }) => {
      const nextOrdre = (membresQuery.data?.length || 0) + 1;
      const { error } = await supabase.from("membres").insert({
        user_id: user!.id,
        tontine_id: tontine!.id,
        nom,
        telephone: telephone || null,
        ordre: nextOrdre,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["membres"] }),
  });

  const updateMembre = useMutation({
    mutationFn: async ({ id, nom, telephone }: { id: string; nom: string; telephone?: string }) => {
      const { error } = await supabase
        .from("membres")
        .update({ nom, telephone: telephone || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["membres"] }),
  });

  const deleteMembre = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("membres").delete().eq("id", id);
      if (error) throw error;
      // Reorder remaining members
      const remaining = membresQuery.data?.filter((m) => m.id !== id) || [];
      for (let i = 0; i < remaining.length; i++) {
        await supabase
          .from("membres")
          .update({ ordre: i + 1 })
          .eq("id", remaining[i].id);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["membres"] }),
  });

  return {
    membres: membresQuery.data || [],
    loading: membresQuery.isLoading,
    addMembre,
    updateMembre,
    deleteMembre,
  };
}

export function useHistorique() {
  const { tontine } = useTontine();

  const historiqueQuery = useQuery({
    queryKey: ["historique", tontine?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historique")
        .select("*")
        .eq("tontine_id", tontine!.id)
        .order("numero_tour", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!tontine,
  });

  return { historique: historiqueQuery.data || [], loading: historiqueQuery.isLoading };
}

export function useLancerTour() {
  const { user } = useAuth();
  const { tontine } = useTontine();
  const { membres } = useMembres();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!tontine || membres.length === 0) throw new Error("Aucun membre.");

      const currentIndex = tontine.index_tour_actuel % membres.length;
      const beneficiaire = membres[currentIndex];
      const totalTour = tontine.montant * membres.length;
      const nextIndex = tontine.index_tour_actuel + 1;

      // Insert historique
      const { error: hErr } = await supabase.from("historique").insert({
        user_id: user!.id,
        tontine_id: tontine.id,
        membre_id: beneficiaire.id,
        numero_tour: nextIndex,
        montant: totalTour,
        nom_membre: beneficiaire.nom,
      });
      if (hErr) throw hErr;

      // Update index
      const { error: tErr } = await supabase
        .from("tontines")
        .update({ index_tour_actuel: nextIndex })
        .eq("id", tontine.id);
      if (tErr) throw tErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tontine"] });
      qc.invalidateQueries({ queryKey: ["historique"] });
    },
  });
}
