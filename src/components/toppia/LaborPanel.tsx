import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  useDeleteLaborProfile,
  useLaborProfiles,
  useUpsertLaborProfile,
} from "@/hooks/useToppiaData";
import { formatEuro } from "@/lib/toppia-calc";
import type { LaborProfile } from "@/lib/toppia-types";
import { toast } from "sonner";

export function LaborPanel() {
  const profiles = useLaborProfiles();
  const upsert = useUpsertLaborProfile();
  const del = useDeleteLaborProfile();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LaborProfile | null>(null);

  const handleSave = async (f: { name: string; hourly_rate: number }) => {
    try {
      await upsert.mutateAsync({ ...(editing ? { id: editing.id } : {}), ...f });
      toast.success(editing ? "Profil mis à jour" : "Profil ajouté");
      setOpen(false);
      setEditing(null);
    } catch (e) {
      toast.error("Enregistrement impossible", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  return (
    <Card className="border-border bg-card shadow-[var(--shadow-soft)]">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="font-display text-xl text-primary">
            Profils de main-d'œuvre
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Définissez vos profils et leurs taux horaires.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </DialogTrigger>
          <ProfileDialog key={editing?.id ?? "new"} initial={editing} onSubmit={handleSave} busy={upsert.isPending} />
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead className="text-right">Taux horaire</TableHead>
              <TableHead className="w-[120px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(profiles.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                  Aucun profil.
                </TableCell>
              </TableRow>
            ) : (
              profiles.data!.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatEuro(Number(p.hourly_rate))} / h
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer « {p.name} » ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Les recettes utilisant ce profil garderont la ligne mais perdront le lien.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                try {
                                  await del.mutateAsync(p.id);
                                  toast.success("Profil supprimé");
                                } catch (e) {
                                  toast.error("Suppression impossible", {
                                    description: e instanceof Error ? e.message : undefined,
                                  });
                                }
                              }}
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ProfileDialog({
  initial,
  onSubmit,
  busy,
}: {
  initial: LaborProfile | null;
  onSubmit: (f: { name: string; hourly_rate: number }) => void;
  busy: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [rate, setRate] = useState(initial ? String(initial.hourly_rate) : "");
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="font-display text-primary">
          {initial ? "Modifier le profil" : "Nouveau profil"}
        </DialogTitle>
      </DialogHeader>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const r = Number(rate);
          if (!name.trim() || !(r >= 0)) return;
          onSubmit({ name: name.trim(), hourly_rate: r });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="lp-name">Nom</Label>
          <Input id="lp-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lp-rate">Taux horaire (€/h)</Label>
          <Input
            id="lp-rate"
            type="number"
            step="any"
            min="0"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            required
          />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={busy}>
            {initial ? "Enregistrer" : "Ajouter"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
