import { Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Chip, ChipRow } from "../../ui/Chip";
import s from "./TagInput.module.css";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
}

export function TagInput({ tags, onChange, suggestions }: TagInputProps) {
  const [draft, setDraft] = useState("");

  const add = (value: string) => {
    const tag = value.trim().toLowerCase();
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
    setDraft("");
  };

  const unused = suggestions.filter((tag) => !tags.includes(tag));

  return (
    <div className={s.wrapper}>
      <div className={s.box}>
        <AnimatePresence initial={false}>
          {tags.map((tag) => (
            <motion.span
              key={tag}
              layout
              className={s.tag}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove tag ${tag}`}
                onClick={() => onChange(tags.filter((other) => other !== tag))}
              >
                <X />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          className={s.input}
          value={draft}
          placeholder={tags.length ? "Add tag…" : "e.g. veggie, quick"}
          aria-label="Add tag"
          autoCapitalize="off"
          enterKeyHint="done"
          onChange={(event) => {
            const value = event.target.value;
            if (value.endsWith(",")) add(value.slice(0, -1));
            else setDraft(value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add(draft);
            } else if (event.key === "Backspace" && !draft && tags.length > 0) {
              onChange(tags.slice(0, -1));
            }
          }}
          onBlur={() => draft && add(draft)}
        />
      </div>
      {unused.length > 0 && (
        <ChipRow>
          {unused.map((tag) => (
            <Chip key={tag} icon={<Plus />} onClick={() => add(tag)}>
              {tag}
            </Chip>
          ))}
        </ChipRow>
      )}
    </div>
  );
}
