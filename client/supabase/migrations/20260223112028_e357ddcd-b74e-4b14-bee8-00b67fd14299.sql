
-- Add subscription fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS abonnement_actif boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS date_expiration timestamp with time zone DEFAULT (now() + interval '7 days');

-- Add date_prochain_tour to tontines
ALTER TABLE public.tontines
ADD COLUMN IF NOT EXISTS date_prochain_tour date DEFAULT NULL;

-- Create paiements table
CREATE TABLE IF NOT EXISTS public.paiements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  montant integer NOT NULL DEFAULT 5000,
  date_paiement timestamp with time zone NOT NULL DEFAULT now(),
  valide_par_admin boolean NOT NULL DEFAULT false,
  reference text DEFAULT ''
);

ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own paiements"
ON public.paiements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own paiements"
ON public.paiements FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admin can manage all paiements"
ON public.paiements FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- Update handle_new_user to set 7-day trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _phone TEXT;
BEGIN
  _phone := NEW.raw_user_meta_data->>'telephone';
  
  INSERT INTO public.profiles (user_id, telephone, abonnement_actif, date_expiration)
  VALUES (NEW.id, _phone, true, now() + interval '7 days');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  INSERT INTO public.tontines (user_id, nom, montant)
  VALUES (NEW.id, 'Ma Tontine', 5000);
  
  RETURN NEW;
END;
$$;
