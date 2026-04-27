# TOPPIA — Calculateur de coût de revient & dashboard

Outil de gestion interne en français pour la marque de pâtisserie TOPPIA. Permet de gérer matières premières, charges fixes, profils de main-d'œuvre, de composer des recettes ligne par ligne, et de suivre la rentabilité dans le temps via un tableau de bord. **Données stockées en base** (Lovable Cloud / Supabase) pour un vrai suivi dans la durée.

## Identité visuelle

Charte graphique TOPPIA appliquée comme tokens du design system (variables CSS dans `src/styles.css` + couleurs sémantiques Tailwind v4) :

- **Cerise #54001C** — primaire (titres, boutons primaires)
- **Citron #EDD494** — fond clair des cards
- **Banane #D9A654** — neutre doré (bordures, boutons secondaires)
- **Framboise #E87391** — accents, badges « plus rentable »
- **Zeste #F2DEA8** — fond général de l'app
- **Polices Google Fonts** : Playfair Display (titres bold) + Nunito (corps)
- Coins arrondis 12–16px, ombres douces, ambiance chaleureuse et appétissante

## Architecture des écrans

Layout principal avec sidebar (desktop) / barre d'onglets en bas (mobile). Logo TOPPIA en haut. 3 sections :

```
/                  → 📊 Tableau de bord
/couts             → 💰 Coûts (avec 3 sous-onglets : Matières / Charges fixes / Main-d'œuvre)
/recettes          → 📋 Liste des recettes
/recettes/$id      → Fiche recette détaillée (création + édition)
```

## Authentification

Application interne : un compte unique partagé par l'équipe TOPPIA suffit, mais on s'appuie sur **Lovable Cloud Auth** (email + mot de passe) pour protéger l'accès. À la première utilisation, l'utilisateur crée son compte ; ensuite il se connecte. Toutes les données sont scoppées par utilisateur via RLS (chaque utilisateur voit ses propres ingrédients/recettes).

Si vous préférez un accès totalement ouvert sans login, on pourra le retirer — mais avec une vraie BDD c'est recommandé.

## Module 1 — Coûts (3 sous-onglets)

### A. Matières premières
- Tableau filtrable par nom
- Colonnes : Nom · Conditionnement (qté + unité) · Prix conditionnement · **Prix unitaire calculé**
- Bouton « Ajouter un ingrédient » → modal (nom, unité [g/kg/ml/L/unité/sachet], quantité, prix)
- Modifier / supprimer (avec confirmation)
- Pré-rempli avec 15 ingrédients courants

### B. Charges fixes
- Formulaire unique persistant : Électricité, Loyer + charges, lignes « Autres charges » avec libellé personnalisable (ajout/suppression libre), Heures/mois
- Card de résultat mise en avant : **Total mensuel** + **« Coût fixe : X.XX €/heure »**
- Pré-rempli : 150€ + 600€ / 160h

### C. Main-d'œuvre
- Liste de profils (nom + taux €/h)
- CRUD via modal
- Pré-rempli : Pâtissière 25€/h, Assistante 15€/h

## Module 2 — Recettes

### Vue liste
Grille de cartes : image (placeholder si vide), nom, coût/pièce, prix TTC/pièce, badge marge. Bouton « Nouvelle recette » bien visible. État vide illustré.

### Fiche recette

**Infos générales** : titre, description, image (URL ou upload vers Lovable Cloud Storage), rendement (nb de pièces).

**Section « Coûts de la recette »** — liste de lignes typées, chaque ligne via un sélecteur de type :

- **Type 1 — Ingrédient** : sélection depuis catalogue + quantité dans l'unité native → coût auto
- **Type 2 — Main-d'œuvre** : profil + minutes → coût MO auto. **Sous la ligne**, en lecture seule, une ligne fantôme « Charges fixes imputées : (min/60) × coût fixe horaire »
- **Type 3 — Coût libre** : libellé personnalisable + montant € (ex : packaging, transport)

Bouton « + Ajouter un coût ». Chaque ligne : éditable et supprimable (icône poubelle).

**Récapitulatif coût de revient** (card Banane mise en avant) :
- Sous-total Ingrédients
- Sous-total Main-d'œuvre
- Sous-total Charges fixes imputées (somme automatique des lignes MO)
- Sous-total Coûts libres
- **Coût de revient total**
- **Coût de revient par pièce** (total ÷ rendement)

**Section « Prix de vente »** :
- TVA (5,5% / 10% / 20%)
- Frais supplémentaires : liste éditable de lignes (libellé + €/pièce), ajoutables/supprimables
- Toggle entre 2 modes :
  - **Mode A — « Je fixe ma marge »** : marge % saisie → HT = (coût/pièce + frais) × (1 + marge/100), TTC = HT × (1 + TVA/100)
  - **Mode B — « Je fixe mon prix »** : prix TTC saisi → marge effective calculée et affichée
- **Bandeau final mis en avant (grande card Cerise)** :
  ```
  Prix de vente conseillé TTC
  XX.XX € / pièce
  Marge : XX%  —  TVA : X.X%
  ```

Tous les calculs sont en temps réel. Sauvegarde explicite via bouton (recette = entité éditable, on ne veut pas écrire en base à chaque frappe).

Recette exemple pré-remplie : **Madeleines au citron** (12 pièces) avec ingrédients, MO, packaging et prix de vente complets.

## Module 3 — Tableau de bord

**En-tête** :
- Nombre total de recettes
- Badge Framboise « Plus rentable 🏆 » avec nom de la recette
- Badge orange « À surveiller ⚠️ »

**Tableau** : Recette · Coût/pièce · Prix TTC/pièce · Marge €/pièce · Marge % avec code couleur (vert >50%, orange 30–50%, rouge <30%). Tri par marge décroissante par défaut. Clic sur une ligne → ouvre la fiche recette.

## UX transverse

- Calculs en temps réel
- Confirmation avant suppression (AlertDialog)
- Toasts (Sonner) pour création/sauvegarde/suppression
- États vides illustrés
- Formulaires en modal (Dialog) ou inline
- Responsive : sidebar → onglets bottom sur mobile

## Détails techniques

**Stack & back-end**
- Frontend : TanStack Start (déjà en place), React 19, Tailwind v4, shadcn/ui
- Back-end : **Lovable Cloud** (Supabase managé) — Postgres + Auth + Storage
- Auth : email/mot de passe via Supabase Auth
- Persistance : tables Postgres avec RLS scoppant chaque ligne au `user_id` du créateur. La mention « clés `toppia-ingredients`… » du brief est remplacée par de vraies tables — c'est ce qui permet le suivi dans le temps

**Schéma de base de données**
- `ingredients` (id, user_id, name, unit, pack_quantity, pack_price, created_at, updated_at)
- `labor_profiles` (id, user_id, name, hourly_rate, created_at, updated_at)
- `fixed_costs` (id, user_id, electricity, rent, hours_per_month, created_at, updated_at) — ligne unique par utilisateur
- `fixed_cost_extras` (id, fixed_costs_id, label, amount) — pour les « Autres charges »
- `recipes` (id, user_id, title, description, image_url, yield_pieces, vat_rate, pricing_mode, target_margin_percent, manual_ttc_price, created_at, updated_at)
- `recipe_cost_lines` (id, recipe_id, position, type ['ingredient'|'labor'|'free'], ingredient_id?, quantity?, labor_profile_id?, minutes?, free_label?, free_amount?)
- `recipe_extra_fees` (id, recipe_id, label, amount_per_piece)

RLS sur toutes les tables : `auth.uid() = user_id` (ou via la recette parente). Triggers `updated_at` automatiques. Seed initial déclenché côté client à la première connexion (15 ingrédients, 2 profils, charges par défaut, recette exemple).

**Storage** : bucket public `recipe-images` pour les photos de recettes.

**Calculs** : encapsulés dans `src/lib/toppia-calc.ts` (fonctions pures, testables). Hooks TanStack Query pour fetch/mutate les données et invalider les caches après mutation.

**Fichiers principaux à créer**
- `src/styles.css` (refonte tokens couleurs + import Google Fonts)
- `src/lib/toppia-types.ts`, `src/lib/toppia-calc.ts`, `src/lib/toppia-defaults.ts` (seed)
- `src/hooks/useIngredients.ts`, `useLaborProfiles.ts`, `useFixedCosts.ts`, `useRecipes.ts`
- `src/components/AppShell.tsx` (sidebar + outlet + auth guard)
- `src/components/toppia/*` (modals, tableaux, lignes de coût, cards récap, badges marge)
- Routes : `__root.tsx` (providers : QueryClient + Auth), `index.tsx` (dashboard), `couts.tsx`, `recettes.tsx`, `recettes.$id.tsx`, `auth.tsx` (login/signup)
- Migration SQL pour les tables + RLS + triggers
