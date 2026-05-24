import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ArrowLeft, Check, ChevronsUpDown, Plus, Save, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  useDeleteRecipe,
  useFixedCosts,
  useIngredients,
  useLaborProfiles,
  useRecipeWithDetails,
  useSaveCostLines,
  useSaveExtraFees,
  useUpdateRecipe,
  type CostLineDraft,
  type ExtraFeeDraft,
} from "@/hooks/useToppiaData";
import {
  computeRecipeCost,
  computeSellingPrice,
  fixedHourlyCost,
  formatEuro,
  ingredientUnitPrice,
} from "@/lib/toppia-calc";
import {
  type CostLineType,
  type PricingMode,
  UNIT_LABELS,
  VAT_RATES,
} from "@/lib/toppia-types";
import { toast } from "sonner";

export const Route = createFileRoute("/recettes/$id")({
  component: RecipePage,
  head: () => ({ meta: [{ title: "Recette — TOPPIA" }] }),
});

function emptyLine(type: CostLineType): CostLineDraft {
  return {
    position: 0,
    type,
    ingredient_id: null,
    quantity: type === "ingredient" ? 0 : null,
    labor_profile_id: null,
    minutes: type === "labor" ? 0 : null,
    free_label: type === "free" ? "" : null,
    free_amount: type === "free" ? 0 : null,
  };
}

function QuantityInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [display, setDisplay] = useState(() =>
    value != null ? String(value).replace(".", ",") : ""
  );
  return (
    <Input
      type="text"
      inputMode="decimal"
      value={display}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9,]/g, "");
        const parts = raw.split(",");
        const cleaned = parts.length > 2 ? parts[0] + "," + parts.slice(1).join("") : raw;
        setDisplay(cleaned);
        const numeric = parseFloat(cleaned.replace(",", "."));
        onChange(isNaN(numeric) ? null : numeric);
      }}
    />
  );
}

type IngredientOption = { id: string; name: string };

function IngredientCombobox({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: IngredientOption[];
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{selected ? selected.name : "Choisir…"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher…" />
          <CommandList>
            <CommandEmpty>Aucun ingrédient trouvé.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.id}
                  value={o.name}
                  onSelect={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                >
                  <Check className={`mr-2 h-4 w-4 ${value === o.id ? "opacity-100" : "opacity-0"}`} />
                  {o.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function RecipePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const recipeQ = useRecipeWithDetails(id);
  const ingredients = useIngredients();
  const profiles = useLaborProfiles();
  const fixedQ = useFixedCosts();

  const updateMut = useUpdateRecipe();
  const saveLines = useSaveCostLines();
  const saveFees = useSaveExtraFees();
  const deleteMut = useDeleteRecipe();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [yieldPieces, setYieldPieces] = useState("12");
  const [vatRate, setVatRate] = useState<number>(5.5);
  const [mode, setMode] = useState<PricingMode>("margin");
  const [margin, setMargin] = useState("60");
  const [manualTtc, setManualTtc] = useState("");
  const [lines, setLines] = useState<CostLineDraft[]>([]);
  const [fees, setFees] = useState<ExtraFeeDraft[]>([]);

  useEffect(() => {
    const r = recipeQ.data;
    if (!r) return;
    setTitle(r.title);
    setDescription(r.description ?? "");
    setImageUrl(r.image_url ?? "");
    setYieldPieces(String(r.yield_pieces));
    setVatRate(Number(r.vat_rate));
    setMode(r.pricing_mode);
    setMargin(String(r.target_margin_percent));
    setManualTtc(r.manual_ttc_price != null ? String(r.manual_ttc_price) : "");
    setLines(r.cost_lines.map((l) => ({ ...l })));
    setFees(r.extra_fees.map((f) => ({ ...f })));
  }, [recipeQ.data]);

  const fixedHourly = fixedHourlyCost(
    Number(fixedQ.data?.electricity ?? 0),
    Number(fixedQ.data?.rent ?? 0),
    (fixedQ.data?.other_charges ?? []).reduce((s, x) => s + Number(x.amount || 0), 0),
    Number(fixedQ.data?.hours_per_month ?? 160),
  );

  const yieldN = Math.max(1, Number(yieldPieces) || 1);
  const cost = useMemo(
    () =>
      computeRecipeCost(
        lines.map((l, i) => ({ ...l, id: l.id ?? `tmp-${i}`, recipe_id: id })) as never,
        ingredients.data ?? [],
        profiles.data ?? [],
        fixedHourly,
        yieldN,
      ),
    [lines, ingredients.data, profiles.data, fixedHourly, yieldN, id],
  );

  const sell = useMemo(
    () =>
      computeSellingPrice(
        cost.perPiece,
        fees.map((f, i) => ({ ...f, id: f.id ?? `tmp-${i}`, recipe_id: id })) as never,
        vatRate,
        mode,
        Number(margin) || 0,
        manualTtc ? Number(manualTtc) : null,
      ),
    [cost.perPiece, fees, vatRate, mode, margin, manualTtc, id],
  );

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Le titre est obligatoire");
      return;
    }
    try {
      await updateMut.mutateAsync({
        id,
        title: title.trim(),
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        yield_pieces: yieldN,
        vat_rate: vatRate,
        pricing_mode: mode,
        target_margin_percent: Number(margin) || 0,
        manual_ttc_price: mode === "price" && manualTtc ? Number(manualTtc) : null,
      });
      await saveLines.mutateAsync({ recipeId: id, lines });
      await saveFees.mutateAsync({ recipeId: id, fees });
      toast.success("Recette enregistrée");
    } catch (e) {
      toast.error("Enregistrement impossible", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  if (recipeQ.isLoading) {
    return (
      <ProtectedLayout>
        <div className="py-10 text-center text-sm text-muted-foreground">Chargement…</div>
      </ProtectedLayout>
    );
  }
  if (!recipeQ.data) {
    return (
      <ProtectedLayout>
        <div className="py-10 text-center text-sm text-muted-foreground">
          Recette introuvable.{" "}
          <Link to="/recettes" className="font-semibold text-primary underline">
            Retour
          </Link>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate({ to: "/recettes" })}>
            <ArrowLeft className="h-4 w-4" /> Recettes
          </Button>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="gap-2 text-destructive">
                  <Trash2 className="h-4 w-4" /> Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer cette recette ?</AlertDialogTitle>
                  <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      try {
                        await deleteMut.mutateAsync(id);
                        toast.success("Recette supprimée");
                        navigate({ to: "/recettes" });
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
            <Button onClick={handleSave} className="gap-2" disabled={updateMut.isPending || saveLines.isPending || saveFees.isPending}>
              <Save className="h-4 w-4" /> Enregistrer
            </Button>
          </div>
        </div>

        {/* Infos générales */}
        <Card className="border-border bg-card shadow-[var(--shadow-soft)]">
          <CardHeader>
            <CardTitle className="font-display text-xl text-primary">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="r-title">Titre</Label>
              <Input id="r-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-desc">Description</Label>
              <Textarea id="r-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="r-img">URL de l'image (optionnel)</Label>
                <Input id="r-img" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-yield">Rendement (nombre de pièces)</Label>
                <Input id="r-yield" type="number" min={1} value={yieldPieces} onChange={(e) => setYieldPieces(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lignes de coût */}
        <Card className="border-border bg-card shadow-[var(--shadow-soft)]">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="font-display text-xl text-primary">Coûts de la recette</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setLines((l) => [...l, emptyLine("ingredient")])}>
                <Plus className="h-3.5 w-3.5" /> Ingrédient
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setLines((l) => [...l, emptyLine("labor")])}>
                <Plus className="h-3.5 w-3.5" /> Main-d'œuvre
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setLines((l) => [...l, emptyLine("free")])}>
                <Plus className="h-3.5 w-3.5" /> Coût libre
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {lines.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aucune ligne. Ajoutez votre premier coût ci-dessus.
              </p>
            )}
            {lines.map((line, idx) => {
              const update = (patch: Partial<CostLineDraft>) =>
                setLines((arr) => arr.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
              const remove = () => setLines((arr) => arr.filter((_, i) => i !== idx));

              if (line.type === "ingredient") {
                const ing = ingredients.data?.find((i) => i.id === line.ingredient_id);
                const lineCost = ing && line.quantity ? Number(line.quantity) * ingredientUnitPrice(ing) : 0;
                return (
                  <div key={idx} className="rounded-xl border border-border bg-secondary/30 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Ingrédient</span>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={remove}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
                      <div>
                        <Label className="text-xs">Ingrédient</Label>
                        <IngredientCombobox
                          value={line.ingredient_id}
                          options={ingredients.data ?? []}
                          onChange={(id) => update({ ingredient_id: id })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Quantité ({ing ? UNIT_LABELS[ing.unit] : "—"})</Label>
                        <QuantityInput value={line.quantity} onChange={(v) => update({ quantity: v })} />
                      </div>
                      <div className="text-right text-sm font-semibold tabular-nums text-primary sm:min-w-24">
                        {formatEuro(lineCost)}
                      </div>
                    </div>
                  </div>
                );
              }

              if (line.type === "labor") {
                const profile = profiles.data?.find((p) => p.id === line.labor_profile_id);
                const hours = (Number(line.minutes) || 0) / 60;
                const lineCost = profile ? hours * Number(profile.hourly_rate) : 0;
                const fixedImputed = hours * fixedHourly;
                return (
                  <div key={idx} className="rounded-xl border border-border bg-secondary/30 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="rounded-full bg-banane/30 px-2 py-0.5 text-xs font-semibold text-primary">Main-d'œuvre</span>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={remove}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
                      <div>
                        <Label className="text-xs">Profil</Label>
                        <Select value={line.labor_profile_id ?? ""} onValueChange={(v) => update({ labor_profile_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                          <SelectContent>
                            {(profiles.data ?? []).map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name} ({formatEuro(Number(p.hourly_rate))}/h)</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Durée (minutes)</Label>
                        <Input type="number" step="any" min="0" value={line.minutes ?? ""} onChange={(e) => update({ minutes: Number(e.target.value) })} />
                      </div>
                      <div className="text-right text-sm font-semibold tabular-nums text-primary sm:min-w-24">
                        {formatEuro(lineCost)}
                      </div>
                    </div>
                    <div className="mt-2 rounded-lg bg-card/70 px-3 py-1.5 text-xs text-muted-foreground">
                      Charges fixes imputées : <span className="font-semibold tabular-nums text-foreground">{formatEuro(fixedImputed)}</span>
                    </div>
                  </div>
                );
              }

              // free
              return (
                <div key={idx} className="rounded-xl border border-border bg-secondary/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded-full bg-framboise/20 px-2 py-0.5 text-xs font-semibold text-primary">Coût libre</span>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={remove}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
                    <div>
                      <Label className="text-xs">Libellé</Label>
                      <Input value={line.free_label ?? ""} onChange={(e) => update({ free_label: e.target.value })} placeholder="Packaging, transport…" />
                    </div>
                    <div>
                      <Label className="text-xs">Montant (€)</Label>
                      <Input type="number" step="any" min="0" value={line.free_amount ?? ""} onChange={(e) => update({ free_amount: Number(e.target.value) })} />
                    </div>
                    <div className="text-right text-sm font-semibold tabular-nums text-primary sm:min-w-24">
                      {formatEuro(Number(line.free_amount) || 0)}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Récap coût de revient */}
        <Card className="border-banane bg-secondary shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="font-display text-xl text-primary">Récapitulatif coût de revient</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row label="Sous-total Ingrédients" value={cost.ingredients} />
            <Row label="Sous-total Main-d'œuvre" value={cost.labor} />
            <Row label="Sous-total Charges fixes imputées" value={cost.fixed} />
            <Row label="Sous-total Coûts libres" value={cost.free} />
            <div className="my-2 border-t border-banane/60" />
            <Row label="Coût de revient total" value={cost.total} bold />
            <Row label="Coût de revient par pièce" value={cost.perPiece} bold highlight />
          </CardContent>
        </Card>

        {/* Prix de vente */}
        <Card className="border-border bg-card shadow-[var(--shadow-soft)]">
          <CardHeader>
            <CardTitle className="font-display text-xl text-primary">Prix de vente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Taux de TVA</Label>
                <Select value={String(vatRate)} onValueChange={(v) => setVatRate(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VAT_RATES.map((r) => (
                      <SelectItem key={r} value={String(r)}>{r}%</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Mode de calcul</Label>
                <Tabs value={mode} onValueChange={(v) => setMode(v as PricingMode)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="margin">Je fixe ma marge</TabsTrigger>
                    <TabsTrigger value="price">Je fixe mon prix</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {mode === "margin" ? (
              <div className="space-y-1.5 max-w-xs">
                <Label htmlFor="r-margin">Marge souhaitée (%)</Label>
                <Input id="r-margin" type="number" step="any" value={margin} onChange={(e) => setMargin(e.target.value)} />
              </div>
            ) : (
              <div className="space-y-1.5 max-w-xs">
                <Label htmlFor="r-ttc">Prix TTC souhaité par pièce (€)</Label>
                <Input id="r-ttc" type="number" step="any" value={manualTtc} onChange={(e) => setManualTtc(e.target.value)} />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Frais supplémentaires (€/pièce)</Label>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setFees((f) => [...f, { label: "", amount_per_piece: 0 }])}>
                  <Plus className="h-3.5 w-3.5" /> Ajouter
                </Button>
              </div>
              {fees.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun frais supplémentaire.</p>
              ) : (
                fees.map((f, i) => (
                  <div key={i} className="flex gap-2">
                    <Input placeholder="Libellé" value={f.label} onChange={(e) => setFees((arr) => arr.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                    <Input type="number" step="any" min="0" className="w-32" value={String(f.amount_per_piece)} onChange={(e) => setFees((arr) => arr.map((x, j) => (j === i ? { ...x, amount_per_piece: Number(e.target.value) } : x)))} />
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setFees((arr) => arr.filter((_, j) => j !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-2xl bg-primary p-5 text-center text-primary-foreground shadow-[var(--shadow-card)]">
              <div className="text-xs uppercase tracking-widest opacity-80">
                Prix de vente conseillé TTC
              </div>
              <div className="mt-1 font-display text-4xl font-bold tabular-nums sm:text-5xl">
                {formatEuro(sell.ttcPerPiece)}
                <span className="ml-1 text-base font-normal opacity-80">/ pièce</span>
              </div>
              <div className="mt-2 text-sm opacity-90">
                Marge : {sell.marginPercent.toFixed(1)}% — TVA : {vatRate}% — HT : {formatEuro(sell.htPerPiece)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  );
}

function Row({ label, value, bold, highlight }: { label: string; value: number; bold?: boolean; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${highlight ? "rounded-lg bg-primary/10 px-2 py-1.5" : ""}`}>
      <span className={bold ? "font-semibold text-primary" : "text-muted-foreground"}>{label}</span>
      <span className={`tabular-nums ${bold ? "font-display text-lg font-bold text-primary" : "text-foreground"}`}>
        {formatEuro(value)}
      </span>
    </div>
  );
}
