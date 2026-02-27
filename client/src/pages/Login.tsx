import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signIn } from "@/lib/auth";
import { Phone, Lock } from "lucide-react";

export default function Login() {
  const [telephone, setTelephone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!telephone.trim()) {
      setError("Entrez votre numéro de téléphone.");
      return;
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError("Le PIN doit contenir exactement 4 chiffres.");
      return;
    }

    setLoading(true);
    try {
      await signIn(telephone.trim(), pin);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl font-bold text-secondary-foreground">T</span>
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground">TOUR</h1>
          <p className="text-primary-foreground/70 mt-1">Gestion Tontine Simple</p>
        </div>

        <div className="w-full max-w-sm bg-card rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-center mb-6">Connexion</h2>

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-xl p-3 mb-4 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Numéro de téléphone
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="Ex: 77 123 45 67"
                  className="input-field pl-12"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Code PIN
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="4 chiffres"
                  className="input-field pl-12 tracking-[0.5em]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-action bg-primary text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Pas de compte ?{" "}
            <Link to="/inscription" className="text-primary font-semibold">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
