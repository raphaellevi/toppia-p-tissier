-- ============================================================
-- BOXES
-- ============================================================
CREATE TABLE public.boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  packaging_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
  vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 5.5,
  pricing_mode TEXT NOT NULL DEFAULT 'auto' CHECK (pricing_mode IN ('auto', 'manual')),
  manual_ttc_price NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX boxes_user_id_idx ON public.boxes(user_id);
ALTER TABLE public.boxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own boxes"   ON public.boxes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own boxes" ON public.boxes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own boxes" ON public.boxes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own boxes" ON public.boxes FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER boxes_updated_at BEFORE UPDATE ON public.boxes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- BOX RECIPES
-- ============================================================
CREATE TABLE public.box_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX box_recipes_box_id_idx ON public.box_recipes(box_id);
ALTER TABLE public.box_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own box_recipes" ON public.box_recipes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.boxes b WHERE b.id = box_recipes.box_id AND b.user_id = auth.uid()));
CREATE POLICY "Users can insert own box_recipes" ON public.box_recipes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.boxes b WHERE b.id = box_recipes.box_id AND b.user_id = auth.uid()));
CREATE POLICY "Users can update own box_recipes" ON public.box_recipes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.boxes b WHERE b.id = box_recipes.box_id AND b.user_id = auth.uid()));
CREATE POLICY "Users can delete own box_recipes" ON public.box_recipes FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.boxes b WHERE b.id = box_recipes.box_id AND b.user_id = auth.uid()));
