import { useState, useEffect, useMemo } from "react";

interface CountdownRingProps {
  targetDate: string; // ISO date string
  beneficiaireName: string;
  montant: number;
  onTourReady?: boolean;
}

export default function CountdownRing({ targetDate, beneficiaireName, montant, onTourReady }: CountdownRingProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const target = useMemo(() => {
    const d = new Date(targetDate);
    d.setHours(8, 0, 0, 0); // Default tour time 8:00 AM
    return d.getTime();
  }, [targetDate]);

  const diffMs = target - now;
  const isReady = diffMs <= 0;

  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const hours = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
  const minutes = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));
  const seconds = Math.max(0, Math.floor((diffMs % (1000 * 60)) / 1000));

  // Progress: assume 30-day cycle
  const totalCycle = 30 * 24 * 60 * 60 * 1000;
  const elapsed = totalCycle - Math.max(0, diffMs);
  const progress = Math.min(1, Math.max(0, elapsed / totalCycle));

  const radius = 80;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  if (isReady) {
    return (
      <div className="rounded-2xl p-6 border-2 border-primary bg-primary/10 text-center space-y-3 animate-fade-in">
        <div className="relative w-48 h-48 mx-auto">
          <svg viewBox="0 0 200 200" className="w-full h-full animate-pulse">
            <circle
              cx="100" cy="100" r={radius}
              fill="none"
              stroke="hsl(var(--primary) / 0.2)"
              strokeWidth={stroke}
            />
            <circle
              cx="100" cy="100" r={radius}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={stroke + 2}
              strokeDasharray={circumference}
              strokeDashoffset={0}
              strokeLinecap="round"
              transform="rotate(-90 100 100)"
              className="drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl">🎉</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">C'est le tour de</p>
        <p className="text-3xl font-bold text-primary">{beneficiaireName}</p>
        <p className="text-sm text-muted-foreground">{montant.toLocaleString()} FCFA</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-6 border border-border bg-card text-center space-y-3">
      <div className="relative w-48 h-48 mx-auto">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={stroke}
          />
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Prochain tour dans</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-primary tabular-nums">{String(days).padStart(2, "0")}</span>
            <span className="text-[10px] text-muted-foreground">J</span>
            <span className="text-2xl font-bold text-primary tabular-nums">{String(hours).padStart(2, "0")}</span>
            <span className="text-[10px] text-muted-foreground">H</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-primary tabular-nums">{String(minutes).padStart(2, "0")}</span>
            <span className="text-[10px] text-muted-foreground">MIN</span>
            <span className="text-lg font-bold text-primary tabular-nums">{String(seconds).padStart(2, "0")}</span>
            <span className="text-[10px] text-muted-foreground">SEC</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Bénéficiaire : <span className="font-semibold text-foreground">{beneficiaireName}</span>
      </p>
    </div>
  );
}
