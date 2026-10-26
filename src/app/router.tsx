import { createBrowserRouter, Navigate } from "react-router";
import { CardsPage } from "../features/cards/CardsPage";
import { PlanPage } from "../features/planner/PlanPage";
import { RecipeEditPage } from "../features/recipes/RecipeEditPage";
import { RecipePage } from "../features/recipes/RecipePage";
import { RecipesPage } from "../features/recipes/RecipesPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { ShoppingPage } from "../features/shopping/ShoppingPage";
import { Root } from "./Root";

export const router = createBrowserRouter([
  {
    Component: Root,
    children: [
      { index: true, Component: PlanPage },
      { path: "recipes", Component: RecipesPage },
      { path: "recipes/new", Component: RecipeEditPage },
      { path: "recipes/:id", Component: RecipePage },
      { path: "recipes/:id/edit", Component: RecipeEditPage },
      { path: "shopping", Component: ShoppingPage },
      { path: "cards", Component: CardsPage },
      { path: "settings", Component: SettingsPage },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
