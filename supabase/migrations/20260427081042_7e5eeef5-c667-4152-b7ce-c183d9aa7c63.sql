
-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE public.ingredient_unit AS ENUM ('g', 'kg', 'ml', 'L', 'unite', 'sachet');
CREATE TYPE public.cost_line_type AS ENUM ('ingredient', 'labor', 'free');
CREATE TYPE public.pricing_mode AS ENUM ('margin', 'price');

-- ============================================
-- updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- INGREDIENTS
-- ============================================
CREATE TABLE public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit public.ingredient_unit NOT NULL DEFAULT 'g',
  pack_quantity NUMERIC(12, 4) NOT NULL CHECK (pack_quantity > 0),
  pack_price NUMERIC(12, 4) NOT NULL CHECK (pack_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ingredients_user_id_idx ON public.ingredients(user_id);
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own ingredients" ON public.ingredients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ingredients" ON public.ingredients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ingredients" ON public.ingredients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ingredients" ON public.ingredients FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER ingredients_updated_at BEFORE UPDATE ON public.ingredients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- LABOR PROFILES
-- ============================================
CREATE TABLE public.labor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hourly_rate NUMERIC(10, 2) NOT NULL CHECK (hourly_rate >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX labor_profiles_user_id_idx ON public.labor_profiles(user_id);
ALTER TABLE public.labor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own labor_profiles" ON public.labor_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own labor_profiles" ON public.labor_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own labor_profiles" ON public.labor_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own labor_profiles" ON public.labor_profiles FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER labor_profiles_updated_at BEFORE UPDATE ON public.labor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- FIXED COSTS (one row per user)
-- ============================================
CREATE TABLE public.fixed_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  electricity NUMERIC(10, 2) NOT NULL DEFAULT 0,
  rent NUMERIC(10, 2) NOT NULL DEFAULT 0,
  other_charges JSONB NOT NULL DEFAULT '[]'::jsonb,
  hours_per_month NUMERIC(8, 2) NOT NULL DEFAULT 160 CHECK (hours_per_month > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own fixed_costs" ON public.fixed_costs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own fixed_costs" ON public.fixed_costs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own fixed_costs" ON public.fixed_costs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own fixed_costs" ON public.fixed_costs FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER fixed_costs_updated_at BEFORE UPDATE ON public.fixed_costs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- RECIPES
-- ============================================
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  yield_pieces INTEGER NOT NULL DEFAULT 1 CHECK (yield_pieces > 0),
  vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 5.5,
  pricing_mode public.pricing_mode NOT NULL DEFAULT 'margin',
  target_margin_percent NUMERIC(6, 2) NOT NULL DEFAULT 50,
  manual_ttc_price NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX recipes_user_id_idx ON public.recipes(user_id);
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own recipes" ON public.recipes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recipes" ON public.recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recipes" ON public.recipes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recipes" ON public.recipes FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER recipes_updated_at BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- RECIPE COST LINES
-- ============================================
CREATE TABLE public.recipe_cost_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  type public.cost_line_type NOT NULL,
  -- ingredient type
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE SET NULL,
  quantity NUMERIC(12, 4),
  -- labor type
  labor_profile_id UUID REFERENCES public.labor_profiles(id) ON DELETE SET NULL,
  minutes NUMERIC(8, 2),
  -- free type
  free_label TEXT,
  free_amount NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX recipe_cost_lines_recipe_id_idx ON public.recipe_cost_lines(recipe_id);
ALTER TABLE public.recipe_cost_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own recipe_cost_lines" ON public.recipe_cost_lines FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_cost_lines.recipe_id AND r.user_id = auth.uid()));
CREATE POLICY "Users can insert own recipe_cost_lines" ON public.recipe_cost_lines FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_cost_lines.recipe_id AND r.user_id = auth.uid()));
CREATE POLICY "Users can update own recipe_cost_lines" ON public.recipe_cost_lines FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_cost_lines.recipe_id AND r.user_id = auth.uid()));
CREATE POLICY "Users can delete own recipe_cost_lines" ON public.recipe_cost_lines FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_cost_lines.recipe_id AND r.user_id = auth.uid()));

-- ============================================
-- RECIPE EXTRA FEES
-- ============================================
CREATE TABLE public.recipe_extra_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  amount_per_piece NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX recipe_extra_fees_recipe_id_idx ON public.recipe_extra_fees(recipe_id);
ALTER TABLE public.recipe_extra_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own recipe_extra_fees" ON public.recipe_extra_fees FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_extra_fees.recipe_id AND r.user_id = auth.uid()));
CREATE POLICY "Users can insert own recipe_extra_fees" ON public.recipe_extra_fees FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_extra_fees.recipe_id AND r.user_id = auth.uid()));
CREATE POLICY "Users can update own recipe_extra_fees" ON public.recipe_extra_fees FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_extra_fees.recipe_id AND r.user_id = auth.uid()));
CREATE POLICY "Users can delete own recipe_extra_fees" ON public.recipe_extra_fees FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_extra_fees.recipe_id AND r.user_id = auth.uid()));

-- ============================================
-- SEED FUNCTION + TRIGGER ON NEW USER
-- ============================================
CREATE OR REPLACE FUNCTION public.seed_toppia_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := NEW.id;
  v_recipe_id UUID;
  v_beurre UUID;
  v_farine UUID;
  v_sucre UUID;
  v_oeufs UUID;
  v_citron UUID;
  v_patissiere UUID;
BEGIN
  -- Ingredients
  INSERT INTO public.ingredients (user_id, name, unit, pack_quantity, pack_price) VALUES
    (v_user_id, 'Beurre doux', 'g', 250, 2.50),
    (v_user_id, 'Farine T55', 'kg', 1, 1.20),
    (v_user_id, 'Sucre en poudre', 'kg', 1, 1.40),
    (v_user_id, 'Œufs', 'unite', 6, 2.10),
    (v_user_id, 'Lait entier', 'L', 1, 1.10),
    (v_user_id, 'Crème liquide entière', 'L', 1, 3.20),
    (v_user_id, 'Chocolat noir 70%', 'g', 200, 3.50),
    (v_user_id, 'Chocolat blanc', 'g', 200, 3.20),
    (v_user_id, 'Miel', 'g', 500, 6.50),
    (v_user_id, 'Levure chimique', 'sachet', 3, 1.20),
    (v_user_id, 'Sel fin', 'kg', 1, 0.80),
    (v_user_id, 'Vanille en poudre', 'g', 10, 4.50),
    (v_user_id, 'Fraises', 'g', 500, 4.50),
    (v_user_id, 'Framboises', 'g', 250, 4.20),
    (v_user_id, 'Amandes en poudre', 'g', 250, 4.80);

  -- Récupère quelques ingrédients pour la recette exemple
  SELECT id INTO v_beurre FROM public.ingredients WHERE user_id = v_user_id AND name = 'Beurre doux' LIMIT 1;
  SELECT id INTO v_farine FROM public.ingredients WHERE user_id = v_user_id AND name = 'Farine T55' LIMIT 1;
  SELECT id INTO v_sucre  FROM public.ingredients WHERE user_id = v_user_id AND name = 'Sucre en poudre' LIMIT 1;
  SELECT id INTO v_oeufs  FROM public.ingredients WHERE user_id = v_user_id AND name = 'Œufs' LIMIT 1;

  -- Ajout d'un ingrédient citron pour la recette exemple
  INSERT INTO public.ingredients (user_id, name, unit, pack_quantity, pack_price)
  VALUES (v_user_id, 'Citrons jaunes', 'unite', 6, 2.40)
  RETURNING id INTO v_citron;

  -- Labor profiles
  INSERT INTO public.labor_profiles (user_id, name, hourly_rate) VALUES
    (v_user_id, 'Pâtissière', 25),
    (v_user_id, 'Assistante', 15);
  SELECT id INTO v_patissiere FROM public.labor_profiles WHERE user_id = v_user_id AND name = 'Pâtissière' LIMIT 1;

  -- Fixed costs
  INSERT INTO public.fixed_costs (user_id, electricity, rent, other_charges, hours_per_month)
  VALUES (v_user_id, 150, 600, '[]'::jsonb, 160);

  -- Recette exemple : Madeleines au citron (12 pièces)
  INSERT INTO public.recipes (user_id, title, description, yield_pieces, vat_rate, pricing_mode, target_margin_percent)
  VALUES (v_user_id, 'Madeleines au citron', 'Madeleines moelleuses au zeste de citron jaune, dorées au four.', 12, 5.5, 'margin', 60)
  RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_cost_lines (recipe_id, position, type, ingredient_id, quantity) VALUES
    (v_recipe_id, 0, 'ingredient', v_beurre, 100),
    (v_recipe_id, 1, 'ingredient', v_farine, 0.15),
    (v_recipe_id, 2, 'ingredient', v_sucre, 0.10),
    (v_recipe_id, 3, 'ingredient', v_oeufs, 2),
    (v_recipe_id, 4, 'ingredient', v_citron, 1);

  INSERT INTO public.recipe_cost_lines (recipe_id, position, type, labor_profile_id, minutes)
  VALUES (v_recipe_id, 5, 'labor', v_patissiere, 30);

  INSERT INTO public.recipe_cost_lines (recipe_id, position, type, free_label, free_amount)
  VALUES (v_recipe_id, 6, 'free', 'Packaging boîte kraft (12 pièces)', 1.20);

  INSERT INTO public.recipe_extra_fees (recipe_id, label, amount_per_piece)
  VALUES (v_recipe_id, 'Étiquette personnalisée', 0.05);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_seed_toppia
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.seed_toppia_for_user();
