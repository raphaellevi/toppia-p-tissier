// Types domaine TOPPIA — alignés sur le schéma Postgres.

export type IngredientUnit = "g" | "kg" | "ml" | "L" | "unite" | "sachet";
export type CostLineType = "ingredient" | "labor" | "free";
export type PricingMode = "margin" | "price";

export const UNIT_LABELS: Record<IngredientUnit, string> = {
  g: "g",
  kg: "kg",
  ml: "ml",
  L: "L",
  unite: "unité",
  sachet: "sachet",
};

export const VAT_RATES = [5.5, 10, 20] as const;

export interface Ingredient {
  id: string;
  user_id: string;
  name: string;
  unit: IngredientUnit;
  pack_quantity: number;
  pack_price: number;
  created_at: string;
  updated_at: string;
}

export interface LaborProfile {
  id: string;
  user_id: string;
  name: string;
  hourly_rate: number;
  created_at: string;
  updated_at: string;
}

export interface FixedCostExtra {
  label: string;
  amount: number;
}

export interface FixedCosts {
  id: string;
  user_id: string;
  electricity: number;
  rent: number;
  other_charges: FixedCostExtra[];
  hours_per_month: number;
  created_at: string;
  updated_at: string;
}

export interface CostLine {
  id: string;
  recipe_id: string;
  position: number;
  type: CostLineType;
  ingredient_id: string | null;
  quantity: number | null;
  labor_profile_id: string | null;
  minutes: number | null;
  free_label: string | null;
  free_amount: number | null;
}

export interface ExtraFee {
  id: string;
  recipe_id: string;
  label: string;
  amount_per_piece: number;
}

export interface Recipe {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  yield_pieces: number;
  vat_rate: number;
  pricing_mode: PricingMode;
  target_margin_percent: number;
  manual_ttc_price: number | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeWithDetails extends Recipe {
  cost_lines: CostLine[];
  extra_fees: ExtraFee[];
}

export type BoxPricingMode = "auto" | "manual";

export interface Box {
  id: string;
  user_id: string;
  name: string;
  packaging_cost: number;
  vat_rate: number;
  pricing_mode: BoxPricingMode;
  manual_ttc_price: number | null;
  created_at: string;
  updated_at: string;
}

export interface BoxRecipe {
  id: string;
  box_id: string;
  recipe_id: string;
  quantity: number;
  position: number;
  created_at: string;
}

export interface BoxWithDetails extends Box {
  box_recipes: BoxRecipe[];
  recipes: RecipeWithDetails[];
}
