import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateRecipe, useRecipes } from "@/hooks/useToppiaData";
import { ImageIcon, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatEuro } from "@/lib/toppia-calc";

export const Route = createFileRoute("/recettes")({
  component: RecettesPage,
  head: () => ({ meta: [{ title: "Recettes — TOPPIA" }] }),
});

function RecettesPage() {
  const recipes = useRecipes();
  const createMut = useCreateRecipe();
  const navigate = useNavigate();

  const handleCreate = async () => {
    try {
      const id = await createMut.mutateAsync({ title: "Nouvelle recette" });
      toast.success("Recette créée");
      navigate({ to: "/recettes/$id", params: { id } });
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
            <h1 className="font-display text-3xl font-bold text-primary sm:text-4xl">
              Recettes
            </h1>
            <p className="text-sm text-muted-foreground">
              Vos fiches de coût de revient et de prix de vente.
            </p>
          </div>
          <Button onClick={handleCreate} disabled={createMut.isPending} className="gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle recette
          </Button>
        </header>

        {recipes.isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Chargement…
          </div>
        ) : (recipes.data?.length ?? 0) === 0 ? (
          <Card className="border-dashed border-banane bg-secondary/40">
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ImageIcon className="h-7 w-7" />
              </div>
              <div className="font-display text-lg text-primary">
                Aucune recette pour l'instant
              </div>
              <p className="max-w-sm text-sm text-muted-foreground">
                Créez votre première fiche pour calculer son coût de revient et son
                prix de vente.
              </p>
              <Button onClick={handleCreate} disabled={createMut.isPending} className="mt-2 gap-2">
                <Plus className="h-4 w-4" /> Nouvelle recette
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.data!.map((r) => (
              <Link
                key={r.id}
                to="/recettes/$id"
                params={{ id: r.id }}
                className="group block"
              >
                <Card className="h-full overflow-hidden border-border bg-card transition-all hover:border-primary/40 hover:shadow-[var(--shadow-card)]">
                  <div className="aspect-[16/10] w-full overflow-hidden bg-secondary">
                    {r.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.image_url}
                        alt={r.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-banane">
                        <ImageIcon className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <CardContent className="space-y-1 p-4">
                    <div className="font-display text-lg font-bold text-primary">
                      {r.title}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Rendement : {r.yield_pieces} pcs</span>
                      {r.manual_ttc_price != null && (
                        <span className="font-semibold text-primary">
                          {formatEuro(Number(r.manual_ttc_price))}
                        </span>
                      )}
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
