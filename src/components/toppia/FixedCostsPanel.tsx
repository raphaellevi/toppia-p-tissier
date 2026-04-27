import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Save, Trash2, Zap } from "lucide-react";
import { useFixedCosts, useUpsertFixedCosts } from "@/hooks/useToppiaData";
import { fixedHourlyCost, formatEuro } from "@/lib/toppia-calc";
import { toast } from "sonner";
import type { FixedCostExtra } from "@/lib/toppia-types";

export function FixedCostsPanel() {
  const fixed = useFixedCosts();
  const upsert = useUpsertFixedCosts();

  const [electricity, setElectricity] = useState("0");
  const [rent, setRent] = useState("0");
  const [hours, setHours] = useState("160");
  const [extras, setExtras] = useState<FixedCostExtra[]>([]);

  useEffect(() => {
    if (fixed.data) {
      setElectricity(String(fixed.data.electricity ?? 0));
      setRent(String(fixed.data.rent ?? 0));
      setHours(String(fixed.data.hours_per_month ?? 160));
      setExtras(fixed.data.other_charges ?? []);
    }
  }, [fixed.data]);

  const eN = Number(electricity) || 0;
  const rN = Number(rent) || 0;
  const hN = Number(hours) || 0;
  const otherTotal = extras.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const total = eN + rN + otherTotal;
  const hourly = fixedHourlyCost(eN, rN, otherTotal, hN);

  const handleSave = async () => {
    if (hN <= 0) {
      toast.error("Heures par mois doit être > 0");
      return;
    }
    try {
      await upsert.mutateAsync({
        electricity: eN,
        rent: rN,
        other_charges: extras.map((e) => ({
          label: e.label.trim() || "Autre",
          amount: Number(e.amount) || 0,
        })),
        hours_per_month: hN,
      });
      toast.success("Charges fixes enregistrées");
    } catch (e) {
      toast.error("Enregistrement impossible", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2 border-border bg-card shadow-[var(--shadow-soft)]">
        <CardHeader>
          <CardTitle className="font-display text-xl text-primary">
            Charges fixes mensuelles
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Renseignez vos charges, elles seront converties en coût horaire.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Électricité / énergie (€/mois)" id="elec" value={electricity} onChange={setElectricity} />
            <Field label="Loyer + charges (€/mois)" id="rent" value={rent} onChange={setRent} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Autres charges</Label>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => setExtras((e) => [...e, { label: "", amount: 0 }])}
              >
                <Plus className="h-4 w-4" /> Ajouter
              </Button>
            </div>
            {extras.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune charge supplémentaire.</p>
            ) : (
              <div className="space-y-2">
                {extras.map((e, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder="Libellé (ex : assurance)"
                      value={e.label}
                      onChange={(ev) =>
                        setExtras((arr) =>
                          arr.map((x, i) => (i === idx ? { ...x, label: ev.target.value } : x)),
                        )
                      }
                    />
                    <Input
                      type="number"
                      step="any"
                      placeholder="€/mois"
                      className="w-32"
                      value={String(e.amount)}
                      onChange={(ev) =>
                        setExtras((arr) =>
                          arr.map((x, i) =>
                            i === idx ? { ...x, amount: Number(ev.target.value) } : x,
                          ),
                        )
                      }
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setExtras((arr) => arr.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Field label="Heures de travail estimées par mois" id="h" value={hours} onChange={setHours} />

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={upsert.isPending} className="gap-2">
              <Save className="h-4 w-4" /> Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-secondary shadow-[var(--shadow-card)]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-base text-primary">
            <Zap className="h-4 w-4" /> Coût fixe horaire
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="font-display text-4xl font-bold text-primary tabular-nums">
            {formatEuro(hourly)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">/ heure</span>
          </div>
          <div className="rounded-xl bg-card/70 p-3 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Total mensuel</span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatEuro(total)}
              </span>
            </div>
            <div className="mt-1 flex justify-between">
              <span>Heures / mois</span>
              <span className="font-semibold tabular-nums text-foreground">{hN}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Ce coût horaire est imputé automatiquement à chaque ligne de
            main-d'œuvre dans vos recettes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        step="any"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
