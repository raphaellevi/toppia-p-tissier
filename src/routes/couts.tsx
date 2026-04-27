import { createFileRoute } from "@tanstack/react-router";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IngredientsPanel } from "@/components/toppia/IngredientsPanel";
import { FixedCostsPanel } from "@/components/toppia/FixedCostsPanel";
import { LaborPanel } from "@/components/toppia/LaborPanel";

export const Route = createFileRoute("/couts")({
  component: CoutsPage,
  head: () => ({ meta: [{ title: "Coûts — TOPPIA" }] }),
});

function CoutsPage() {
  return (
    <ProtectedLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="font-display text-3xl font-bold text-primary sm:text-4xl">
            Coûts
          </h1>
          <p className="text-sm text-muted-foreground">
            Catalogue des matières premières, charges fixes et profils de main-d'œuvre.
          </p>
        </header>

        <Tabs defaultValue="ingredients" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ingredients">Matières premières</TabsTrigger>
            <TabsTrigger value="fixed">Charges fixes</TabsTrigger>
            <TabsTrigger value="labor">Main-d'œuvre</TabsTrigger>
          </TabsList>
          <TabsContent value="ingredients" className="mt-4">
            <IngredientsPanel />
          </TabsContent>
          <TabsContent value="fixed" className="mt-4">
            <FixedCostsPanel />
          </TabsContent>
          <TabsContent value="labor" className="mt-4">
            <LaborPanel />
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedLayout>
  );
}
