import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBoxes, useCreateBox } from "@/hooks/useToppiaData";
import { formatEuro } from "@/lib/toppia-calc";
import { Box, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/boxes/")({
  component: BoxesPage,
  head: () => ({ meta: [{ title: "Boxes — TOPPIA" }] }),
});

function BoxesPage() {
  const boxes = useBoxes();
  const createMut = useCreateBox();
  const navigate = useNavigate();

  const handleCreate = async () => {
    try {
      const id = await createMut.mutateAsync({ name: "Nouvelle box" });
      toast.success("Box créée");
      navigate({ to: "/boxes/$id", params: { id } });
    } catch (e) {
      toast.error("Création impossible", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  return (
    <ProtectedLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-primary sm:text-4xl">Boxes</h1>
            <p className="text-sm text-muted-foreground">
              Calculez le coût de revient et le prix de vente de vos boxes.
            </p>
          </div>
          <Button onClick={handleCreate} disabled={createMut.isPending} className="gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle box
          </Button>
        </header>

        {boxes.isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Chargement…</div>
        ) : boxes.isError ? (
          <div className="py-10 text-center text-sm text-destructive">
            Erreur : {boxes.error instanceof Error ? boxes.error.message : "Impossible de charger les boxes."}
            <p className="mt-1 text-xs text-muted-foreground">Vérifiez que la migration SQL a été appliquée dans Supabase.</p>
          </div>
        ) : (boxes.data?.length ?? 0) === 0 ? (
          <Card className="border-dashed border-banane bg-secondary/40">
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Box className="h-7 w-7" />
              </div>
              <div className="font-display text-lg text-primary">Aucune box pour l'instant</div>
              <p className="max-w-sm text-sm text-muted-foreground">
                Créez votre première box pour calculer son coût de revient à partir de vos recettes.
              </p>
              <Button onClick={handleCreate} disabled={createMut.isPending} className="mt-2 gap-2">
                <Plus className="h-4 w-4" /> Nouvelle box
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boxes.data!.map((b) => (
              <Link key={b.id} to="/boxes/$id" params={{ id: b.id }} className="group block">
                <Card className="h-full border-border bg-card transition-all hover:border-primary/40 hover:shadow-[var(--shadow-card)]">
                  <CardContent className="space-y-2 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-display text-lg font-bold text-primary leading-tight">
                        {b.name}
                      </div>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Box className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{b.recipe_count} recette{b.recipe_count !== 1 ? "s" : ""}</span>
                      <span>Packaging : {formatEuro(Number(b.packaging_cost))}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
