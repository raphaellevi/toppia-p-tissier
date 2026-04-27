import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  useDeleteIngredient,
  useIngredients,
  useUpsertIngredient,
} from "@/hooks/useToppiaData";
import {
  type Ingredient,
  type IngredientUnit,
  UNIT_LABELS,
} from "@/lib/toppia-types";
import { ingredientUnitPrice, formatEuro, formatNumber } from "@/lib/toppia-calc";
import { toast } from "sonner";

const UNITS: IngredientUnit[] = ["g", "kg", "ml", "L", "unite", "sachet"];

export function IngredientsPanel() {
  const ingredients = useIngredients();
  const upsertMut = useUpsertIngredient();
  const deleteMut = useDeleteIngredient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return ingredients.data ?? [];
    return (ingredients.data ?? []).filter((i) => i.name.toLowerCase().includes(s));
  }, [ingredients.data, search]);

  const handleSave = async (form: {
    name: string;
    unit: IngredientUnit;
    pack_quantity: number;
    pack_price: number;
  }) => {
    try {
      await upsertMut.mutateAsync({
        ...(editing ? { id: editing.id } : {}),
        ...form,
      });
      toast.success(editing ? "Ingrédient mis à jour" : "Ingrédient ajouté");
      setEditing(null);
      setOpen(false);
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
            Matières premières
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Catalogue de vos ingrédients et leur prix unitaire calculé.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 sm:w-56"
            />
          </div>
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => setEditing(null)}>
                <Plus className="h-4 w-4" /> Ajouter
              </Button>
            </DialogTrigger>
            <IngredientDialog
              key={editing?.id ?? "new"}
              initial={editing}
              onSubmit={handleSave}
              busy={upsertMut.isPending}
            />
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Conditionnement</TableHead>
                <TableHead className="text-right">Prix conditionnement</TableHead>
                <TableHead className="text-right">Prix unitaire</TableHead>
                <TableHead className="w-[120px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Aucun ingrédient.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((i) => {
                  const unitPrice = ingredientUnitPrice(i);
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-banane text-foreground">
                          {formatNumber(Number(i.pack_quantity), 2)} {UNIT_LABELS[i.unit]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatEuro(Number(i.pack_price))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatEuro(unitPrice, 4)} / {UNIT_LABELS[i.unit]}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditing(i);
                              setOpen(true);
                            }}
                          >
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
                                <AlertDialogTitle>Supprimer « {i.name} » ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cet ingrédient sera retiré du catalogue. Les
                                  recettes qui l'utilisent garderont la ligne mais
                                  perdront le lien.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={async () => {
                                    try {
                                      await deleteMut.mutateAsync(i.id);
                                      toast.success("Ingrédient supprimé");
                                    } catch (e) {
                                      toast.error("Suppression impossible", {
                                        description:
                                          e instanceof Error ? e.message : undefined,
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function IngredientDialog({
  initial,
  onSubmit,
  busy,
}: {
  initial: Ingredient | null;
  onSubmit: (f: { name: string; unit: IngredientUnit; pack_quantity: number; pack_price: number }) => void;
  busy: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [unit, setUnit] = useState<IngredientUnit>(initial?.unit ?? "g");
  const [qty, setQty] = useState<string>(
    initial ? String(initial.pack_quantity) : "",
  );
  const [price, setPrice] = useState<string>(
    initial ? String(initial.pack_price) : "",
  );

  const qtyN = Number(qty);
  const priceN = Number(price);
  const unitPrice = qtyN > 0 ? priceN / qtyN : 0;

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="font-display text-primary">
          {initial ? "Modifier l'ingrédient" : "Nouvel ingrédient"}
        </DialogTitle>
      </DialogHeader>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || !(qtyN > 0) || !(priceN >= 0)) return;
          onSubmit({ name: name.trim(), unit, pack_quantity: qtyN, pack_price: priceN });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="ing-name">Nom</Label>
          <Input id="ing-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Unité</Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as IngredientUnit)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>{UNIT_LABELS[u]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ing-qty">Quantité conditionnement</Label>
            <Input
              id="ing-qty"
              type="number"
              step="any"
              min="0"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ing-price">Prix conditionnement (€)</Label>
          <Input
            id="ing-price"
            type="number"
            step="any"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
        <div className="rounded-xl bg-secondary/60 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Prix unitaire calculé :</span>{" "}
          <span className="font-semibold text-primary tabular-nums">
            {formatEuro(unitPrice, 4)} / {UNIT_LABELS[unit]}
          </span>
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
