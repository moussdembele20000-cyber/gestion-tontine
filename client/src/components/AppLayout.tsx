import { ReactNode } from "react";
import BottomNav from "./BottomNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="page-container max-w-lg mx-auto">
      {children}
      <BottomNav />
    </div>
  );
}
