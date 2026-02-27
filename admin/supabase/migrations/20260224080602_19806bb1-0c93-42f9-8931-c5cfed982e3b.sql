
-- Fix all RLS policies: change from RESTRICTIVE to PERMISSIVE

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert profile on signup" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Super admin can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Super admin can update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Allow insert profile on signup" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- TONTINES
DROP POLICY IF EXISTS "Users manage own tontines" ON public.tontines;
DROP POLICY IF EXISTS "Super admin can view all tontines" ON public.tontines;

CREATE POLICY "Users manage own tontines" ON public.tontines FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Super admin can view all tontines" ON public.tontines FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- MEMBRES
DROP POLICY IF EXISTS "Users manage own membres" ON public.membres;
DROP POLICY IF EXISTS "Super admin can view all membres" ON public.membres;

CREATE POLICY "Users manage own membres" ON public.membres FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Super admin can view all membres" ON public.membres FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- HISTORIQUE
DROP POLICY IF EXISTS "Users manage own historique" ON public.historique;
DROP POLICY IF EXISTS "Super admin can view all historique" ON public.historique;

CREATE POLICY "Users manage own historique" ON public.historique FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Super admin can view all historique" ON public.historique FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- PAIEMENTS
DROP POLICY IF EXISTS "Users can view own paiements" ON public.paiements;
DROP POLICY IF EXISTS "Users can insert own paiements" ON public.paiements;
DROP POLICY IF EXISTS "Super admin can manage all paiements" ON public.paiements;

CREATE POLICY "Users can view own paiements" ON public.paiements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own paiements" ON public.paiements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Super admin can manage all paiements" ON public.paiements FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- USER_ROLES
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admin can manage roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Super admin can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
