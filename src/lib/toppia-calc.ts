// Calculs purs pour TOPPIA — coût de revient et prix de vente.
// Toutes les fonctions sont déterministes et testables.

import type {
  CostLine,
  ExtraFee,
  Ingredient,
  LaborProfile,
  PricingMode,
} from "./toppia-types";

export function ingredientUnitPrice(i: Pick<Ingredient, "pack_quantity" | "pack_price">): number {
  if (!i.pack_quantity || i.pack_quantity <= 0) return 0;
  return Number(i.pack_price) / Number(i.pack_quantity);
}

export function fixedHourlyCost(
  electricity: number,
  rent: number,
  others: number,
  hoursPerMonth: number,
): number {
  if (!hoursPerMonth || hoursPerMonth <= 0) return 0;
  return (Number(electricity) + Number(rent) + Number(others)) / Number(hoursPerMonth);
}

export interface RecipeCostBreakdown {
  ingredients: number;
  labor: number;
  fixed: number; // imputé via les lignes labor
  free: number;
  total: number;
  perPiece: number;
}

export function computeRecipeCost(
  lines: CostLine[],
  ingredients: Ingredient[],
  profiles: LaborProfile[],
  fixedHourly: number,
  yieldPieces: number,
): RecipeCostBreakdown {
  let ing = 0;
  let lab = 0;
  let fix = 0;
  let free = 0;

  for (const l of lines) {
    if (l.type === "ingredient" && l.ingredient_id && l.quantity != null) {
      const ref = ingredients.find((i) => i.id === l.ingredient_id);
      if (ref) ing += Number(l.quantity) * ingredientUnitPrice(ref);
    } else if (l.type === "labor" && l.labor_profile_id && l.minutes != null) {
      const p = profiles.find((x) => x.id === l.labor_profile_id);
      const hours = Number(l.minutes) / 60;
      if (p) lab += hours * Number(p.hourly_rate);
      fix += hours * fixedHourly;
    } else if (l.type === "free" && l.free_amount != null) {
      free += Number(l.free_amount);
    }
  }
  const total = ing + lab + fix + free;
  const perPiece = yieldPieces > 0 ? total / yieldPieces : 0;
  return { ingredients: ing, labor: lab, fixed: fix, free, total, perPiece };
}

export interface SellingPriceResult {
  htPerPiece: number;
  ttcPerPiece: number;
  marginPercent: number;
  extraTotal: number;
}

export function computeSellingPrice(
  costPerPiece: number,
  extras: ExtraFee[],
  vatRate: number,
  mode: PricingMode,
  targetMarginPercent: number,
  manualTtc: number | null,
): SellingPriceResult {
  const extraTotal = extras.reduce((s, e) => s + Number(e.amount_per_piece || 0), 0);
  const base = costPerPiece + extraTotal;

  if (mode === "margin") {
    const ht = base * (1 + targetMarginPercent / 100);
    const ttc = ht * (1 + vatRate / 100);
    return {
      htPerPiece: ht,
      ttcPerPiece: ttc,
      marginPercent: targetMarginPercent,
      extraTotal,
    };
  }
  // mode price
  const ttc = manualTtc ?? 0;
  const ht = vatRate > -100 ? ttc / (1 + vatRate / 100) : 0;
  const margin = base > 0 ? ((ht - base) / base) * 100 : 0;
  return { htPerPiece: ht, ttcPerPiece: ttc, marginPercent: margin, extraTotal };
}

export function formatEuro(n: number, fractionDigits = 2): string {
  if (!Number.isFinite(n)) return "0,00 €";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n);
}

export function formatNumber(n: number, fractionDigits = 2): string {
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n);
}

export function marginBucket(percent: number): "good" | "warn" | "bad" {
  if (percent >= 50) return "good";
  if (percent >= 30) return "warn";
  return "bad";
}

// ============================================================
// BOX CALCULATIONS
// ============================================================

export interface BoxCostBreakdown {
  recipesCost: number;
  packagingCost: number;
  totalCost: number;
}

export interface BoxSellingResult {
  htTotal: number;
  ttcTotal: number;
  marginPercent: number;
}

export function computeBoxCost(
  packagingCost: number,
  entries: Array<{ quantity: number; recipeCostPerPiece: number }>,
): BoxCostBreakdown {
  const recipesCost = entries.reduce((s, e) => s + e.recipeCostPerPiece * e.quantity, 0);
  return { recipesCost, packagingCost: Number(packagingCost), totalCost: recipesCost + Number(packagingCost) };
}

export function computeBoxSellingPrice(
  cost: BoxCostBreakdown,
  entries: Array<{ quantity: number; recipeHtPerPiece: number }>,
  vatRate: number,
  pricingMode: "auto" | "manual",
  manualTtc: number | null,
): BoxSellingResult {
  let htTotal: number;
  let ttcTotal: number;

  if (pricingMode === "auto") {
    htTotal = entries.reduce((s, e) => s + e.recipeHtPerPiece * e.quantity, 0) + cost.packagingCost;
    ttcTotal = htTotal * (1 + vatRate / 100);
  } else {
    ttcTotal = manualTtc ?? 0;
    htTotal = vatRate > -100 ? ttcTotal / (1 + vatRate / 100) : ttcTotal;
  }

  const margin = cost.totalCost > 0 ? ((htTotal - cost.totalCost) / cost.totalCost) * 100 : 0;
  return { htTotal, ttcTotal, marginPercent: margin };
}
