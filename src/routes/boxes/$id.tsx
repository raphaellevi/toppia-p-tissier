import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ArrowLeft, Check, ChevronsUpDown, Plus, Save, Trash2 } from "lucide-react";
import {
  useBoxWithDetails,
  useCreateBox,
  useDeleteBox,
  useIngredients,
  useLaborProfiles,
  useFixedCosts,
  useRecipes,
  useSaveBoxRecipes,
  useUpdateBox,
  type BoxRecipeDraft,
} from "@/hooks/useToppiaData";
import {
  computeBoxCost,
  computeBoxSellingPrice,
  computeRecipeCost,
  computeSellingPrice,
  fixedHourlyCost,
  formatEuro,
  marginBucket,
} from "@/lib/toppia-calc";
import { VAT_RATES, type BoxPricingMode } from "@/lib/toppia-types";
import { toast } from "sonner";

export const Route = createFileRoute("/boxes/$id")({
  component: BoxPage,
  head: () => ({ meta: [{ title: "Box — TOPPIA" }] }),
});

function QuantityInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [display, setDisplay] = useState(String(value));
  useEffect(() => {
    setDisplay(String(value));
  }, [value]);
  return (
    <Input
      type="text"
      inputMode="numeric"
      className="w-20 text-center"
      value={display}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9]/g, "");
        setDisplay(raw);
        const n = parseInt(raw, 10);
        if (!isNaN(n) && n > 0) onChange(n);
      }}
    />
  );
}

function PackagingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [display, setDisplay] = useState(String(value).replace(".", ","));
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
        const n = parseFloat(cleaned.replace(",", "."));
        if (!isNaN(n) && n >= 0) onChange(n);
      }}
    />
  );
}

function RecipeCombobox({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: { id: string; title: string }[];
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
          <span className="truncate">{selected ? selected.title : "Choisir une recette…"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher…" />
          <CommandList>
            <CommandEmpty>Aucune recette trouvée.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.id}
                  value={o.title}
                  onSelect={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                >
                  <Check className={`mr-2 h-4 w-4 ${value === o.id ? "opacity-100" : "opacity-0"}`} />
                  {o.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function BoxPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const boxQ = useBoxWithDetails(id);
  const ingredients = useIngredients();
  const profiles = useLaborProfiles();
  const fixedQ = useFixedCosts();
  const allRecipes = useRecipes();

  const updateMut = useUpdateBox();
  const saveEntries = useSaveBoxRecipes();
  const deleteMut = useDeleteBox();
  const createMut = useCreateBox();

  const [name, setName] = useState("");
  const [packagingCost, setPackagingCost] = useState(0);
  const [vatRate, setVatRate] = useState(5.5);
  const [pricingMode, setPricingMode] = useState<BoxPricingMode>("auto");
  const [manualTtc, setManualTtc] = useState<number | null>(null);
  const [manualTtcDisplay, setManualTtcDisplay] = useState("");
  const [entries, setEntries] = useState<BoxRecipeDraft[]>([]);

  useEffect(() => {
    if (boxQ.data) {
      setName(boxQ.data.name);
      setPackagingCost(Number(boxQ.data.packaging_cost));
      setVatRate(Number(boxQ.data.vat_rate));
      setPricingMode(boxQ.data.pricing_mode);
      setManualTtc(boxQ.data.manual_ttc_price);
      setManualTtcDisplay(
        boxQ.data.manual_ttc_price != null
          ? String(boxQ.data.manual_ttc_price).replace(".", ",")
          : ""
      );
      setEntries(
        boxQ.data.box_recipes.map((br) => ({
          recipe_id: br.recipe_id,
          quantity: Number(br.quantity),
          position: br.position,
        }))
      );
    }
  }, [boxQ.data]);

  const fixedHourly = useMemo(() => {
    const fc = fixedQ.data;
    if (!fc) return 0;
    const others = fc.other_charges.reduce((s, c) => s + Number(c.amount), 0);
    return fixedHourlyCost(Number(fc.electricity), Number(fc.rent), others, Number(fc.hours_per_month));
  }, [fixedQ.data]);

  const recipeDetails = useMemo(() => {
    if (!boxQ.data) return [];
    return entries.map((entry) => {
      const recipe = boxQ.data!.recipes.find((r) => r.id === entry.recipe_id);
      if (!recipe) return null;
      const cost = computeRecipeCost(
        recipe.cost_lines,
        ingredients.data ?? [],
        profiles.data ?? [],
        fixedHourly,
        Number(recipe.yield_pieces)
      );
      const selling = computeSellingPrice(
        cost.perPiece,
        recipe.extra_fees,
        Number(recipe.vat_rate),
        recipe.pricing_mode,
        Number(recipe.target_margin_percent),
        recipe.manual_ttc_price != null ? Number(recipe.manual_ttc_price) : null
      );
      return {
        recipe,
        quantity: entry.quantity,
        costPerPiece: cost.perPiece,
        htPerPiece: selling.htPerPiece,
        ttcPerPiece: selling.ttcPerPiece,
      };
    });
  }, [entries, boxQ.data, ingredients.data, profiles.data, fixedHourly]);

  const boxCost = useMemo(
    () =>
      computeBoxCost(
        packagingCost,
        recipeDetails
          .filter(Boolean)
          .map((d) => ({ quantity: d!.quantity, recipeCostPerPiece: d!.costPerPiece }))
      ),
    [packagingCost, recipeDetails]
  );

  const boxSelling = useMemo(
    () =>
      computeBoxSellingPrice(
        boxCost,
        recipeDetails
          .filter(Boolean)
          .map((d) => ({ quantity: d!.quantity, recipeHtPerPiece: d!.htPerPiece })),
        vatRate,
        pricingMode,
        manualTtc
      ),
    [boxCost, recipeDetails, vatRate, pricingMode, manualTtc]
  );

  const handleSave = async () => {
    try {
      await updateMut.mutateAsync({
        id,
        name,
        packaging_cost: packagingCost,
        vat_rate: vatRate,
        pricing_mode: pricingMode,
        manual_ttc_price: pricingMode === "manual" ? manualTtc : null,
      });
      await saveEntries.mutateAsync({ boxId: id, entries });
      toast.success("Box sauvegardée");
    } catch (e) {
      toast.error("Erreur lors de la sauvegarde", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMut.mutateAsync(id);
      toast.success("Box supprimée");
      navigate({ to: "/boxes" });
    } catch (e) {
      toast.error("Suppression impossible", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const addEntry = () => {
    const firstRecipe = allRecipes.data?.[0];
    if (!firstRecipe) return;
    setEntries((prev) => [
      ...prev,
      { recipe_id: firstRecipe.id, quantity: 1, position: prev.length },
    ]);
  };

  const isSaving = updateMut.isPending || saveEntries.isPending;
  const marginColor =
    marginBucket(boxSelling.marginPercent) === "good"
      ? "text-green-600"
      : marginBucket(boxSelling.marginPercent) === "warn"
        ? "text-yellow-600"
        : "text-red-500";

  if (boxQ.isLoading) {
    return (
      <ProtectedLayout>
        <div className="py-10 text-center text-sm text-muted-foreground">Chargement…</div>
      </ProtectedLayout>
    );
  }

  if (!boxQ.data) {
    return (
      <ProtectedLayout>
        <div className="py-10 text-center text-sm text-muted-foreground">Box introuvable.</div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/boxes">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="font-display text-xl font-bold text-primary border-transparent bg-transparent px-1 shadow-none focus-visible:border-border focus-visible:bg-background"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? "Sauvegarde…" : "Sauvegarder"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer cette box ?</AlertDialogTitle>
                  <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Contenu de la box */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Contenu de la box</CardTitle>
            <Button size="sm" variant="outline" onClick={addEntry} className="gap-1" disabled={!allRecipes.data?.length}>
              <Plus className="h-3.5 w-3.5" />
              Ajouter une recette
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {entries.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aucune recette. Ajoutez une recette ci-dessus.
              </p>
            )}
            {entries.map((entry, idx) => {
              const detail = recipeDetails[idx];
              const update = (patch: Partial<BoxRecipeDraft>) =>
                setEntries((arr) => arr.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
              const remove = () => setEntries((arr) => arr.filter((_, i) => i !== idx));

              return (
                <div key={idx} className="rounded-xl border border-border bg-secondary/30 p-3">
                  <div className="grid gap-3 sm:grid-cols-[2fr_auto_auto_auto] sm:items-end">
                    <div>
                      <Label className="text-xs">Recette</Label>
                      <RecipeCombobox
                        value={entry.recipe_id}
                        options={allRecipes.data ?? []}
                        onChange={(id) => update({ recipe_id: id })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Nb pièces</Label>
                      <QuantityInput
                        value={entry.quantity}
                        onChange={(v) => update({ quantity: v })}
                      />
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Prix TTC/pièce</div>
                      <div className="text-sm font-semibold tabular-nums text-primary">
                        {detail ? formatEuro(detail.ttcPerPiece) : "—"}
                      </div>
                      <div className="text-xs tabular-nums text-muted-foreground">
                        {detail ? `Total : ${formatEuro(detail.ttcPerPiece * entry.quantity)}` : ""}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={remove}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Packaging */}
            <div className="flex items-end gap-3 rounded-xl border border-dashed border-border bg-background p-3">
              <div className="flex-1">
                <Label className="text-xs">Coût du packaging (€ HT)</Label>
                <PackagingInput value={packagingCost} onChange={setPackagingCost} />
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div className="text-xs">Coût total production</div>
                <div className="font-semibold tabular-nums text-foreground">
                  {formatEuro(boxCost.totalCost)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prix de vente */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Prix de vente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode + TVA */}
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <Label className="text-xs">Mode de tarification</Label>
                <Tabs
                  value={pricingMode}
                  onValueChange={(v) => setPricingMode(v as BoxPricingMode)}
                  className="mt-1"
                >
                  <TabsList>
                    <TabsTrigger value="auto">Auto (prix recettes)</TabsTrigger>
                    <TabsTrigger value="manual">Manuel</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div>
                <Label className="text-xs">TVA</Label>
                <Select
                  value={String(vatRate)}
                  onValueChange={(v) => setVatRate(Number(v))}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VAT_RATES.map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {r} %
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {pricingMode === "manual" && (
                <div>
                  <Label className="text-xs">Prix TTC manuel (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="w-32"
                    value={manualTtcDisplay}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9,]/g, "");
                      const parts = raw.split(",");
                      const cleaned = parts.length > 2 ? parts[0] + "," + parts.slice(1).join("") : raw;
                      setManualTtcDisplay(cleaned);
                      const n = parseFloat(cleaned.replace(",", "."));
                      setManualTtc(isNaN(n) ? null : n);
                    }}
                    placeholder="0,00"
                  />
                </div>
              )}
            </div>

            {/* Récap auto */}
            {pricingMode === "auto" && entries.length > 0 && (
              <div className="rounded-lg bg-secondary/40 p-3 text-sm space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Recettes (HT)</span>
                  <span className="tabular-nums">
                    {formatEuro(recipeDetails.filter(Boolean).reduce((s, d) => s + d!.htPerPiece * d!.quantity, 0))}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Packaging</span>
                  <span className="tabular-nums">{formatEuro(packagingCost)}</span>
                </div>
              </div>
            )}

            {/* Résultat */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Coût de production</span>
                <span className="tabular-nums font-medium">{formatEuro(boxCost.totalCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Prix HT</span>
                <span className="tabular-nums font-medium">{formatEuro(boxSelling.htTotal)}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span className="text-primary">Prix TTC</span>
                <span className="tabular-nums text-primary">{formatEuro(boxSelling.ttcTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Marge</span>
                <span className={`tabular-nums font-semibold ${marginColor}`}>
                  {boxSelling.marginPercent.toFixed(1)} %
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  );
}
