
-- Table pour les alertes de relance paiement envoyées par l'admin à l'utilisateur
CREATE TABLE IF NOT EXISTS public.payment_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message TEXT NOT NULL DEFAULT 'Paiement requis — veuillez régulariser votre accès',
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  seen BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.payment_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payment alerts"
ON public.payment_alerts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users update own payment alerts"
ON public.payment_alerts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admin manage payment alerts"
ON public.payment_alerts FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_alerts;
