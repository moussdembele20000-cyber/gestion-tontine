import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useHistorique, useTontine } from "@/hooks/useTontine";
import { Clock, Download, FileText } from "lucide-react";
import jsPDF from "jspdf";

export default function Historique() {
  const { historique, loading } = useHistorique();
  const { tontine } = useTontine();
  const [exporting, setExporting] = useState(false);

  const totalDistribue = historique.reduce((sum, h) => sum + h.montant, 0);
  const formatFCFA = (n: number) => `${n.toLocaleString()} FCFA`;

  const exportPDF = () => {
    if (!tontine || historique.length === 0) return;
    setExporting(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Title
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("RAPPORT TONTINE", pageWidth / 2, 25, { align: "center" });

      // Tontine info
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Nom : ${tontine.nom}`, 20, 45);
      doc.text(`Cotisation : ${formatFCFA(tontine.montant)}`, 20, 53);
      doc.text(`Total distribué : ${formatFCFA(totalDistribue)}`, 20, 61);
      doc.text(`Tours effectués : ${historique.length}`, 20, 69);
      doc.text(`Date : ${new Date().toLocaleDateString("fr-FR")}`, 20, 77);

      // Separator
      doc.setDrawColor(200);
      doc.line(20, 82, pageWidth - 20, 82);

      // Table header
      let y = 92;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Tour", 20, y);
      doc.text("Bénéficiaire", 45, y);
      doc.text("Montant", 120, y);
      doc.text("Date", 160, y);

      doc.line(20, y + 2, pageWidth - 20, y + 2);
      y += 10;

      // Table rows
      doc.setFont("helvetica", "normal");
      historique.forEach((h) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(`#${h.numero_tour}`, 20, y);
        doc.text(h.nom_membre.substring(0, 25), 45, y);
        doc.text(formatFCFA(h.montant), 120, y);
        doc.text(new Date(h.date).toLocaleDateString("fr-FR"), 160, y);
        y += 8;
      });

      // Footer
      y += 10;
      doc.setDrawColor(200);
      doc.line(20, y, pageWidth - 20, y);
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text(`TOTAL : ${formatFCFA(totalDistribue)}`, 20, y);

      doc.save(`rapport_${tontine.nom.replace(/\s/g, "_")}.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setExporting(false);
    }
  };

  const exportText = () => {
    if (!tontine) return;
    let text = `=== RAPPORT TONTINE ===\n`;
    text += `Nom : ${tontine.nom}\n`;
    text += `Cotisation : ${formatFCFA(tontine.montant)}\n`;
    text += `Total distribué : ${formatFCFA(totalDistribue)}\n\n`;
    text += `--- Historique ---\n`;
    historique.forEach((h) => {
      text += `Tour #${h.numero_tour} - ${h.nom_membre} - ${formatFCFA(h.montant)} - ${new Date(h.date).toLocaleDateString("fr-FR")}\n`;
    });

    if (navigator.share) {
      navigator.share({ title: `Rapport ${tontine.nom}`, text });
    } else {
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapport_${tontine.nom}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Historique</h1>
          <div className="flex gap-2">
            <button onClick={exportPDF} disabled={exporting || historique.length === 0} className="p-2 rounded-lg bg-primary-foreground/10 disabled:opacity-50">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </button>
            <button onClick={exportText} className="p-2 rounded-lg bg-primary-foreground/10">
              <Download className="w-5 h-5 text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-3">
        {/* Summary */}
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Total distribué</p>
          <p className="text-2xl font-bold">{formatFCFA(totalDistribue)}</p>
          <p className="text-xs text-muted-foreground">{historique.length} tour(s) effectué(s)</p>
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : historique.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun tour effectué</p>
          </div>
        ) : (
          [...historique].reverse().map((h) => (
            <div key={h.id} className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center text-success font-bold text-sm">
                #{h.numero_tour}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{h.nom_membre}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(h.date).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <p className="font-bold text-sm">{formatFCFA(h.montant)}</p>
            </div>
          ))
        )}
      </div>
    </AppLayout>
  );
}
