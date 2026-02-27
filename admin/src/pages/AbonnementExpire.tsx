import { Navigate } from "react-router-dom";

// Redirect to unified payment screen
export default function AbonnementExpire() {
  return <Navigate to="/paiement" replace />;
}
