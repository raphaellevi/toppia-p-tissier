import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  CostLine,
  ExtraFee,
  FixedCosts,
  Ingredient,
  LaborProfile,
  Recipe,
  RecipeWithDetails,
} from "@/lib/toppia-types";

// ============== INGREDIENTS ==============
export function useIngredients() {
  return useQuery({
    queryKey: ["ingredients"],
    queryFn: async (): Promise<Ingredient[]> => {
      const { data, error } = await supabase
        .from("ingredients")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Ingredient[];
    },
  });
}

export function useUpsertIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Partial<Ingredient> & {
        name: string;
        unit: Ingredient["unit"];
        pack_quantity: number;
        pack_price: number;
      },
    ) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Non authentifié");
      const payload = {
        name: input.name,
        unit: input.unit,
        pack_quantity: input.pack_quantity,
        pack_price: input.pack_price,
        user_id: userData.user.id,
        ...(input.id ? { id: input.id } : {}),
      };
      const { error } = await supabase.from("ingredients").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ingredients"] }),
  });
}

export function useDeleteIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ingredients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ingredients"] }),
  });
}

// ============== LABOR PROFILES ==============
export function useLaborProfiles() {
  return useQuery({
    queryKey: ["labor_profiles"],
    queryFn: async (): Promise<LaborProfile[]> => {
      const { data, error } = await supabase
        .from("labor_profiles")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LaborProfile[];
    },
  });
}

export function useUpsertLaborProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Partial<LaborProfile> & { name: string; hourly_rate: number },
    ) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Non authentifié");
      const payload = {
        name: input.name,
        hourly_rate: input.hourly_rate,
        user_id: userData.user.id,
        ...(input.id ? { id: input.id } : {}),
      };
      const { error } = await supabase.from("labor_profiles").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["labor_profiles"] }),
  });
}

export function useDeleteLaborProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("labor_profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["labor_profiles"] }),
  });
}

// ============== FIXED COSTS ==============
export function useFixedCosts() {
  return useQuery({
    queryKey: ["fixed_costs"],
    queryFn: async (): Promise<FixedCosts | null> => {
      const { data, error } = await supabase.from("fixed_costs").select("*").maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        other_charges: Array.isArray(data.other_charges)
          ? (data.other_charges as FixedCosts["other_charges"])
          : [],
      } as FixedCosts;
    },
  });
}

export function useUpsertFixedCosts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<FixedCosts, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Non authentifié");
      const payload = {
        user_id: userData.user.id,
        electricity: input.electricity,
        rent: input.rent,
        other_charges: input.other_charges,
        hours_per_month: input.hours_per_month,
      };
      const { error } = await supabase
        .from("fixed_costs")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fixed_costs"] }),
  });
}

// ============== RECIPES ==============
export function useRecipes() {
  return useQuery({
    queryKey: ["recipes"],
    queryFn: async (): Promise<Recipe[]> => {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Recipe[];
    },
  });
}

export function useRecipeWithDetails(id: string | undefined) {
  return useQuery({
    queryKey: ["recipe", id],
    enabled: !!id,
    queryFn: async (): Promise<RecipeWithDetails | null> => {
      if (!id) return null;
      const { data: recipe, error: e1 } = await supabase
        .from("recipes")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (e1) throw e1;
      if (!recipe) return null;
      const { data: lines, error: e2 } = await supabase
        .from("recipe_cost_lines")
        .select("*")
        .eq("recipe_id", id)
        .order("position", { ascending: true });
      if (e2) throw e2;
      const { data: fees, error: e3 } = await supabase
        .from("recipe_extra_fees")
        .select("*")
        .eq("recipe_id", id)
        .order("created_at", { ascending: true });
      if (e3) throw e3;
      return {
        ...(recipe as Recipe),
        cost_lines: (lines ?? []) as CostLine[],
        extra_fees: (fees ?? []) as ExtraFee[],
      };
    },
  });
}

export function useCreateRecipe(): UseMutationResult<string, Error, { title: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ title }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Non authentifié");
      const { data, error } = await supabase
        .from("recipes")
        .insert({ title, user_id: userData.user.id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
}

export function useUpdateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Recipe> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await supabase.from("recipes").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["recipes"] });
      qc.invalidateQueries({ queryKey: ["recipe", vars.id] });
    },
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recipes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
}

// ============== COST LINES ==============
export type CostLineDraft = Omit<CostLine, "id" | "recipe_id"> & { id?: string };

export function useSaveCostLines() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recipeId,
      lines,
    }: {
      recipeId: string;
      lines: CostLineDraft[];
    }) => {
      // Stratégie simple : delete-all + insert-all (volume faible par recette).
      const { error: delErr } = await supabase
        .from("recipe_cost_lines")
        .delete()
        .eq("recipe_id", recipeId);
      if (delErr) throw delErr;
      if (lines.length > 0) {
        const payload = lines.map((l, i) => ({
          recipe_id: recipeId,
          position: i,
          type: l.type,
          ingredient_id: l.type === "ingredient" ? l.ingredient_id : null,
          quantity: l.type === "ingredient" ? l.quantity : null,
          labor_profile_id: l.type === "labor" ? l.labor_profile_id : null,
          minutes: l.type === "labor" ? l.minutes : null,
          free_label: l.type === "free" ? l.free_label : null,
          free_amount: l.type === "free" ? l.free_amount : null,
        }));
        const { error } = await supabase.from("recipe_cost_lines").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["recipe", vars.recipeId] });
    },
  });
}

// ============== EXTRA FEES ==============
export type ExtraFeeDraft = Omit<ExtraFee, "id" | "recipe_id"> & { id?: string };

export function useSaveExtraFees() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recipeId,
      fees,
    }: {
      recipeId: string;
      fees: ExtraFeeDraft[];
    }) => {
      const { error: delErr } = await supabase
        .from("recipe_extra_fees")
        .delete()
        .eq("recipe_id", recipeId);
      if (delErr) throw delErr;
      if (fees.length > 0) {
        const payload = fees.map((f) => ({
          recipe_id: recipeId,
          label: f.label,
          amount_per_piece: f.amount_per_piece,
        }));
        const { error } = await supabase.from("recipe_extra_fees").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["recipe", vars.recipeId] });
    },
  });
}
