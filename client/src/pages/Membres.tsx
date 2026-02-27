import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useMembres } from "@/hooks/useTontine";
import { UserPlus, Edit2, Trash2, X, Check } from "lucide-react";

export default function Membres() {
  const { membres, loading, addMembre, updateMembre, deleteMembre } = useMembres();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");

  const handleAdd = async () => {
    if (!nom.trim()) return;
    await addMembre.mutateAsync({ nom: nom.trim(), telephone: telephone.trim() || undefined });
    setNom("");
    setTelephone("");
    setShowAdd(false);
  };

  const handleEdit = async () => {
    if (!editId || !nom.trim()) return;
    await updateMembre.mutateAsync({ id: editId, nom: nom.trim(), telephone: telephone.trim() || undefined });
    setEditId(null);
    setNom("");
    setTelephone("");
  };

  const handleDelete = async (id: string, membreNom: string) => {
    if (!confirm(`Supprimer ${membreNom} ?`)) return;
    await deleteMembre.mutateAsync(id);
  };

  const startEdit = (m: any) => {
    setEditId(m.id);
    setNom(m.nom);
    setTelephone(m.telephone || "");
    setShowAdd(false);
  };

  const cancel = () => {
    setShowAdd(false);
    setEditId(null);
    setNom("");
    setTelephone("");
  };

  return (
    <AppLayout>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Membres</h1>
          <span className="text-sm opacity-80">{membres.length} membre(s)</span>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-3">
        {/* Add / Edit form */}
        {(showAdd || editId) && (
          <div className="bg-card rounded-2xl p-4 shadow-md border border-border space-y-3">
            <h3 className="font-semibold">{editId ? "Modifier" : "Nouveau membre"}</h3>
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Nom du membre *"
              className="input-field"
            />
            <input
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="Téléphone (facultatif)"
              className="input-field"
              type="tel"
            />
            <div className="flex gap-2">
              <button onClick={cancel} className="flex-1 btn-action bg-muted text-foreground flex items-center justify-center gap-2">
                <X className="w-4 h-4" /> Annuler
              </button>
              <button
                onClick={editId ? handleEdit : handleAdd}
                disabled={!nom.trim()}
                className="flex-1 btn-action bg-primary text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> {editId ? "Modifier" : "Ajouter"}
              </button>
            </div>
          </div>
        )}

        {/* Member list */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : membres.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-2">Aucun membre</p>
            <p className="text-sm">Ajoutez votre premier membre.</p>
          </div>
        ) : (
          membres.map((m) => (
            <div key={m.id} className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {m.ordre}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{m.nom}</p>
                {m.telephone && <p className="text-sm text-muted-foreground">{m.telephone}</p>}
              </div>
              <button onClick={() => startEdit(m)} className="p-2 text-muted-foreground hover:text-primary">
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(m.id, m.nom)}
                className="p-2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}

        {/* FAB */}
        {!showAdd && !editId && (
          <button
            onClick={() => setShowAdd(true)}
            className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center z-40"
          >
            <UserPlus className="w-6 h-6" />
          </button>
        )}
      </div>
    </AppLayout>
  );
}
