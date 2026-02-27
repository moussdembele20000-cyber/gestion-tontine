-- Fix ALL RLS policies to PERMISSIVE and enable realtime

-- Drop all existing RESTRICTIVE policies
DROP POLICY IF EXISTS "Users manage own historique" ON public.historique;
DROP POLICY IF EXISTS "Super admin can view all historique" ON public.historique;
DROP POLICY IF EXISTS "Users manage own membres" ON public.membres;
DROP POLICY IF EXISTS "Super admin can view all membres" ON public.membres;
DROP POLICY IF EXISTS "Users can view own paiements" ON public.paiements;
DROP POLICY IF EXISTS "Users can insert own paiements" ON public.paiements;
DROP POLICY IF EXISTS "Super admin can manage all paiements" ON public.paiements;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert profile on signup" ON public.profiles;
DROP POLICY IF EXISTS "Users manage own tontines" ON public.tontines;
DROP POLICY IF EXISTS "Super admin can view all tontines" ON public.tontines;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admin can manage roles" ON public.user_roles;

-- HISTORIQUE - PERMISSIVE
CREATE POLICY "Users manage own historique" ON public.historique FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin view all historique" ON public.historique FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- MEMBRES - PERMISSIVE
CREATE POLICY "Users manage own membres" ON public.membres FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin view all membres" ON public.membres FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- PAIEMENTS - PERMISSIVE
CREATE POLICY "Users view own paiements" ON public.paiements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own paiements" ON public.paiements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin manage all paiements" ON public.paiements FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- PROFILES - PERMISSIVE
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert profile on signup" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admin update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admin delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- TONTINES - PERMISSIVE
CREATE POLICY "Users manage own tontines" ON public.tontines FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin view all tontines" ON public.tontines FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- USER_ROLES - PERMISSIVE
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Ensure handle_new_user trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for profiles and paiements
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.paiements;