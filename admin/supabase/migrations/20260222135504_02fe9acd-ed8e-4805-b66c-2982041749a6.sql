
-- Enum pour les rôles
CREATE TYPE public.app_role AS ENUM ('user', 'super_admin');

-- Table profils utilisateurs
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  telephone TEXT NOT NULL UNIQUE,
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'bloque')),
  date_creation TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Table rôles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Fonction has_role (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Fonction get_user_status (security definer)
CREATE OR REPLACE FUNCTION public.get_user_status(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT statut FROM public.profiles WHERE user_id = _user_id
$$;

-- Table tontines
CREATE TABLE public.tontines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nom TEXT NOT NULL DEFAULT 'Ma Tontine',
  montant INTEGER NOT NULL DEFAULT 5000,
  date_debut DATE DEFAULT CURRENT_DATE,
  index_tour_actuel INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tontines ENABLE ROW LEVEL SECURITY;

-- Table membres
CREATE TABLE public.membres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tontine_id UUID REFERENCES public.tontines(id) ON DELETE CASCADE NOT NULL,
  nom TEXT NOT NULL,
  telephone TEXT,
  ordre INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.membres ENABLE ROW LEVEL SECURITY;

-- Table historique
CREATE TABLE public.historique (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tontine_id UUID REFERENCES public.tontines(id) ON DELETE CASCADE NOT NULL,
  membre_id UUID REFERENCES public.membres(id) ON DELETE SET NULL,
  numero_tour INTEGER NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  montant INTEGER NOT NULL,
  nom_membre TEXT NOT NULL
);

ALTER TABLE public.historique ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Super admin can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Allow insert profile on signup"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies pour user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admin can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies pour tontines
CREATE POLICY "Users manage own tontines"
  ON public.tontines FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies pour membres
CREATE POLICY "Users manage own membres"
  ON public.membres FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies pour historique
CREATE POLICY "Users manage own historique"
  ON public.historique FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger pour créer profil et tontine par défaut à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _phone TEXT;
  _tontine_id UUID;
BEGIN
  _phone := NEW.raw_user_meta_data->>'telephone';
  
  INSERT INTO public.profiles (user_id, telephone)
  VALUES (NEW.id, _phone);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  INSERT INTO public.tontines (user_id, nom, montant)
  VALUES (NEW.id, 'Ma Tontine', 5000)
  RETURNING id INTO _tontine_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Super admin: admin peut aussi gérer historique et tontines pour voir les stats
CREATE POLICY "Super admin can view all tontines"
  ON public.tontines FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can view all membres"
  ON public.membres FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can view all historique"
  ON public.historique FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Super admin peut modifier statut profils
CREATE POLICY "Super admin can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Super admin peut supprimer des profils
CREATE POLICY "Super admin can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.has_role(auth.uid(), 'super_admin'));
