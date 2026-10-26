import { Search } from "lucide-react";
import { Chip, ChipRow } from "../../ui/Chip";
import { Input } from "../../ui/Field";
import s from "./RecipeFilterBar.module.css";
import type { RecipeFilter } from "./useRecipeFilter";

export function RecipeFilterBar({ filter }: { filter: RecipeFilter }) {
  return (
    <div className={s.bar}>
      <label className={s.search}>
        <Search className={s.icon} aria-hidden />
        <span className="visually-hidden">Search recipes</span>
        <Input
          type="search"
          placeholder="Search recipes or ingredients…"
          value={filter.query}
          onChange={(event) => filter.setQuery(event.target.value)}
          className={s.input}
        />
      </label>
      {filter.tags.length > 0 && (
        <ChipRow>
          {filter.tags.map((tag) => (
            <Chip
              key={tag}
              selected={filter.tag === tag}
              onClick={() => filter.setTag(filter.tag === tag ? null : tag)}
            >
              {tag}
            </Chip>
          ))}
        </ChipRow>
      )}
    </div>
  );
}
