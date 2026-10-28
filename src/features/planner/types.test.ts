import { describe, expect, it } from "vite-plus/test";
import { upcomingPlans, type DayPlan } from "./types";

const chili = { recipeId: "chili", servings: 4 };

describe("upcomingPlans", () => {
  const days = new Map<string, DayPlan>([
    ["2026-10-27", { id: "2026-10-27", dinner: { recipes: [chili], note: "" } }],
    [
      "2026-10-28",
      {
        id: "2026-10-28",
        lunch: { recipes: [chili], note: "", cooked: true },
        dinner: { recipes: [chili], fromInventory: ["pumpkin soup"], note: "" },
      },
    ],
    [
      "2026-10-30",
      {
        id: "2026-10-30",
        lunch: { recipes: [chili], note: "" },
        dinner: { recipes: [chili], note: "" },
      },
    ],
    [
      "2026-10-29",
      { id: "2026-10-29", lunch: { recipes: [], fromInventory: ["pumpkin soup"], note: "" } },
    ],
  ]);

  it("lists the days from today on, once per day, skipping cooked meals", () => {
    const plans = upcomingPlans(days, "2026-10-28", { day: "2026-10-31", meal: "lunch" });
    expect(plans.recipes).toEqual(new Map([["chili", ["2026-10-28", "2026-10-30"]]]));
    expect(plans.fromInventory).toEqual(new Map([["pumpkin soup", ["2026-10-28", "2026-10-29"]]]));
  });

  it("leaves out the meal being edited", () => {
    const plans = upcomingPlans(days, "2026-10-28", { day: "2026-10-28", meal: "dinner" });
    expect(plans.recipes.get("chili")).toEqual(["2026-10-30"]);
    expect(plans.fromInventory.get("pumpkin soup")).toEqual(["2026-10-29"]);
  });
});
