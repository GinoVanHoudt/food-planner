/**
 * Seeds the local Firestore emulator with a member and some sample data.
 *
 *   vpx scripts/seed-emulator.ts [member-email]
 *
 * Sign in through the Auth emulator's fake Google screen with the same email.
 */

const PROJECT_ID = "demo-food-planner";
const BASE = `http://127.0.0.1:8080/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

type Value =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { arrayValue: { values: Value[] } }
  | { mapValue: { fields: Record<string, Value> } };

function encode(value: unknown): Value {
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  return { mapValue: { fields: encodeFields(value as Record<string, unknown>) } };
}

function encodeFields(data: Record<string, unknown>): Record<string, Value> {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encode(value)]));
}

async function put(path: string, data: Record<string, unknown>) {
  // "Bearer owner" bypasses security rules in the emulator.
  const response = await fetch(`${BASE}/${path}`, {
    method: "PATCH",
    headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body: JSON.stringify({ fields: encodeFields(data) }),
  });
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
}

function dayKey(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const ingredient = (quantity: number | null, unit: string, name: string) => ({
  quantity,
  unit,
  name,
});

const recipes = {
  chili: {
    name: "Chili sin carne",
    servings: 4,
    tags: ["veggie", "batch"],
    sourceUrl: "",
    instructions: "Fry onion and garlic.\nAdd the rest and simmer for 30 minutes.",
    ingredients: [
      ingredient(2, "", "Onion"),
      ingredient(2, "cloves", "Garlic"),
      ingredient(1, "", "Bell pepper"),
      ingredient(2, "cans", "Kidney beans"),
      ingredient(400, "g", "Chopped tomatoes"),
      ingredient(1, "tbsp", "Chili powder"),
      ingredient(250, "g", "Rice"),
    ],
  },
  pesto: {
    name: "Pasta pesto",
    servings: 4,
    tags: ["quick", "veggie"],
    sourceUrl: "",
    instructions: "Cook the pasta, stir in pesto and tomatoes.",
    ingredients: [
      ingredient(500, "g", "Pasta"),
      ingredient(190, "g", "Pesto"),
      ingredient(250, "g", "Cherry tomatoes"),
      ingredient(50, "g", "Parmesan"),
    ],
  },
  curry: {
    name: "Chicken curry",
    servings: 2,
    tags: ["quick"],
    sourceUrl: "https://example.com/chicken-curry",
    instructions: "Brown the chicken, add curry paste and coconut milk, simmer 15 minutes.",
    ingredients: [
      ingredient(300, "g", "Chicken breast"),
      ingredient(1, "", "Onion"),
      ingredient(400, "ml", "Coconut milk"),
      ingredient(2, "tbsp", "Curry paste"),
      ingredient(150, "g", "Rice"),
    ],
  },
};

const sections: Record<string, string> = {
  onion: "produce",
  garlic: "produce",
  "bell pepper": "produce",
  "cherry tomatoes": "produce",
  "chicken breast": "meat",
  parmesan: "dairy",
  pasta: "pantry",
  rice: "pantry",
  "kidney beans": "pantry",
  "chopped tomatoes": "pantry",
  "coconut milk": "pantry",
};

const locations: Record<string, string> = {
  rice: "pantry",
  "kidney beans": "cans",
  "coconut milk": "cans",
  "chicken breast": "freezer",
  parmesan: "fridge",
};

const amount = (quantity: number, unit: string) => ({ quantity, unit });

const inventory = {
  rice: { name: "Rice", amounts: [amount(1000, "g")], always: false },
  "kidney beans": { name: "Kidney beans", amounts: [amount(1, "cans")], always: false },
  parmesan: { name: "Parmesan", amounts: [amount(100, "g")], always: false },
  salt: { name: "Salt", amounts: [], always: true },
  "olive oil": { name: "Olive oil", amounts: [], always: true },
};

const email = (process.argv[2] ?? "you@example.com").toLowerCase();

await put(`members/${email}`, { name: "Seeded member" });
for (const [id, recipe] of Object.entries(recipes)) await put(`recipes/${id}`, recipe);
for (const [key, sectionId] of Object.entries(sections)) {
  await put(`ingredients/${encodeURIComponent(key)}`, {
    name: key[0].toUpperCase() + key.slice(1),
    sectionId,
    ...(locations[key] && { locationId: locations[key] }),
  });
}
for (const [key, item] of Object.entries(inventory)) {
  await put(`inventory/${encodeURIComponent(key)}`, item);
}
await put(`plan/${dayKey(0)}`, {
  dinner: { recipes: [{ recipeId: "chili", servings: 4 }], note: "" },
});
await put(`plan/${dayKey(1)}`, {
  lunch: { recipes: [], note: "Leftovers: Chili sin carne" },
  dinner: { recipes: [{ recipeId: "curry", servings: 2 }], note: "" },
});
await put(`plan/${dayKey(3)}`, {
  dinner: { recipes: [{ recipeId: "pesto", servings: 4 }], note: "" },
});

console.log(
  `Seeded emulator: member ${email}, ${Object.keys(recipes).length} recipes, 3 planned days, ${Object.keys(inventory).length} inventory items.`,
);
