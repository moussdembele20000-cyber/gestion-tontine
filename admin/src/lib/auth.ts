import { supabase } from "@/integrations/supabase/client";

export async function signUp(telephone: string, pin: string) {
  const email = `${telephone.replace(/[^0-9]/g, '')}@tour.local`;
  const password = `PIN_${pin}_TOUR`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { telephone },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      throw new Error("Ce numéro de téléphone est déjà utilisé.");
    }
    throw new Error("Erreur lors de l'inscription. Réessayez.");
  }

  return data;
}

export async function signIn(telephone: string, pin: string) {
  const email = `${telephone.replace(/[^0-9]/g, '')}@tour.local`;
  const password = `PIN_${pin}_TOUR`;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error("Numéro ou PIN incorrect.");
  }

  // Check if user is blocked
  const { data: status } = await supabase.rpc('get_user_status', {
    _user_id: data.user.id,
  });

  if (status === 'bloque') {
    await supabase.auth.signOut();
    throw new Error("Votre compte est désactivé. Contactez l'administrateur.");
  }

  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getUserRole(userId: string): Promise<string> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  return data?.role || 'user';
}

export async function getUserProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data;
}

export function isSubscriptionExpired(profile: any): boolean {
  if (!profile) return false;
  // Super admins never expire
  if (!profile.date_expiration) return false;
  return new Date(profile.date_expiration) < new Date();
}
