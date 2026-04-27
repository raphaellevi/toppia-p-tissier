import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useFixedCosts,
  useIngredients,
  useLaborProfiles,
  useRecipes,
} from "@/hooks/useToppiaData";
import { supabase } from "@/integrations/supabase/client";
import { useQueries } from "@tanstack/react-query";
import {
  computeRecipeCost,
  computeSellingPrice,
  fixedHourlyCost,
  formatEuro,
  marginBucket,
} from "@/lib/toppia-calc";
import type { CostLine, ExtraFee } from "@/lib/toppia-types";
import { AlertTriangle, FileText, Trophy } from "lucide-react";

export const Route = createFileRoute("/")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Tableau de bord — TOPPIA" }] }),
});

interface RecipeRow {
  id: string;
  title: string;
  costPerPiece: number;
  ttcPerPiece: number;
  marginEuro: number;
  marginPercent: number;
}

function DashboardPage() {
  const ingredientsQ = useIngredients();
  const profilesQ = useLaborProfiles();
  const fixedQ = useFixedCosts();
  const recipesQ = useRecipes();
  const navigate = useNavigate();

  const fixedHourly = fixedHourlyCost(
    Number(fixedQ.data?.electricity ?? 0),
    Number(fixedQ.data?.rent ?? 0),
    (fixedQ.data?.other_charges ?? []).reduce((s, x) => s + Number(x.amount || 0), 0),
    Number(fixedQ.data?.hours_per_month ?? 160),
  );

  const detailQueries = useQueries({
    queries: (recipesQ.data ?? []).map((r) => ({
      queryKey: ["recipe-details-light", r.id],
      queryFn: async () => {
        const [{ data: lines }, { data: fees }] = await Promise.all([
          supabase
            .from("recipe_cost_lines")
            .select("*")
            .eq("recipe_id", r.id),
          supabase
            .from("recipe_extra_fees")
            .select("*")
            .eq("recipe_id", r.id),
        ]);
        return {
          lines: (lines ?? []) as CostLine[],
          fees: (fees ?? []) as ExtraFee[],
        };
      },
    })),
  });

  const rows: RecipeRow[] = useMemo(() => {
    if (!recipesQ.data || !ingredientsQ.data || !profilesQ.data) return [];
    return recipesQ.data.map((r, idx) => {
      const det = detailQueries[idx]?.data;
      const cost = computeRecipeCost(
        det?.lines ?? [],
        ingredientsQ.data!,
        profilesQ.data!,
        fixedHourly,
        r.yield_pieces,
      );
      const sell = computeSellingPrice(
        cost.perPiece,
        det?.fees ?? [],
        Number(r.vat_rate),
        r.pricing_mode,
        Number(r.target_margin_percent),
        r.manual_ttc_price != null ? Number(r.manual_ttc_price) : null,
      );
      return {
        id: r.id,
        title: r.title,
        costPerPiece: cost.perPiece,
        ttcPerPiece: sell.ttcPerPiece,
        marginEuro: sell.htPerPiece - cost.perPiece - sell.extraTotal,
        marginPercent: sell.marginPercent,
      };
    });
  }, [recipesQ.data, ingredientsQ.data, profilesQ.data, detailQueries, fixedHourly]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.marginPercent - a.marginPercent),
    [rows],
  );
  const best = sorted[0];
  const worst = sorted.length > 1 ? sorted[sorted.length - 1] : undefined;

  return (
    <ProtectedLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-primary sm:text-4xl">
              Tableau de bord
            </h1>
            <p className="text-sm text-muted-foreground">
              Vue d'ensemble de la rentabilité de vos recettes.
            </p>
          </div>
          <Button asChild>
            <Link to="/recettes">Voir toutes les recettes</Link>
          </Button>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border bg-card shadow-[var(--shadow-soft)]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-4 w-4" /> Recettes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-display text-4xl font-bold text-primary">
                {rows.length}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[var(--framboise)]/40 bg-[var(--framboise)]/10 shadow-[var(--shadow-soft)]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--cerise)]">
                <Trophy className="h-4 w-4" /> Plus rentable
              </CardTitle>
            </CardHeader>
            <CardContent>
              {best ? (
                <>
                  <div className="font-display text-lg font-bold text-primary">
                    {best.title}
                  </div>
                  <Badge className="mt-1 bg-[var(--framboise)] text-white hover:bg-[var(--framboise)]">
                    {best.marginPercent.toFixed(0)}% de marge
                  </Badge>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">—</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-[var(--warning)]/40 bg-[var(--warning)]/10 shadow-[var(--shadow-soft)]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--cerise)]">
                <AlertTriangle className="h-4 w-4" /> À surveiller
              </CardTitle>
            </CardHeader>
            <CardContent>
              {worst && worst.marginPercent < 50 ? (
                <>
                  <div className="font-display text-lg font-bold text-primary">
                    {worst.title}
                  </div>
                  <Badge variant="outline" className="mt-1 border-[var(--warning)] text-[var(--cerise)]">
                    {worst.marginPercent.toFixed(0)}% de marge
                  </Badge>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Tout va bien 🎉</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-card shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="font-display text-xl text-primary">
              Rentabilité par recette
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sorted.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Aucune recette pour l'instant.{" "}
                <Link to="/recettes" className="font-semibold text-primary underline">
                  Créer la première
                </Link>
                .
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recette</TableHead>
                      <TableHead className="text-right">Coût/pièce</TableHead>
                      <TableHead className="text-right">Prix TTC/pièce</TableHead>
                      <TableHead className="text-right">Marge €/pièce</TableHead>
                      <TableHead className="text-right">Marge %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((r) => {
                      const bucket = marginBucket(r.marginPercent);
                      const colorClass =
                        bucket === "good"
                          ? "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30"
                          : bucket === "warn"
                            ? "bg-[var(--warning)]/15 text-[var(--cerise)] border-[var(--warning)]/40"
                            : "bg-destructive/15 text-destructive border-destructive/30";
                      return (
                        <TableRow
                          key={r.id}
                          className="cursor-pointer"
                          onClick={() =>
                            navigate({ to: "/recettes/$id", params: { id: r.id } })
                          }
                        >
                          <TableCell className="font-medium text-foreground">
                            {r.title}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatEuro(r.costPerPiece)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatEuro(r.ttcPerPiece)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatEuro(r.marginEuro)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className={colorClass}>
                              {r.marginPercent.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  );
}
