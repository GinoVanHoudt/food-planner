import { GripVertical, Plus, X } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { IconButton } from "../../ui/Button";
import { Input } from "../../ui/Field";
import s from "./SectionsEditor.module.css";
import { OTHER_SECTION_ID, saveSections, useSections, type Section } from "./sections";

export function SectionsEditor() {
  const saved = useSections();
  const [items, setItems] = useState(saved);
  const [syncedWith, setSyncedWith] = useState(saved);
  const [dragging, setDragging] = useState(false);
  const [newName, setNewName] = useState("");
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  });

  // Follow changes from the other device, except while a drag is in progress.
  if (saved !== syncedWith && !dragging) {
    setSyncedWith(saved);
    setItems(saved);
  }

  const commit = (next: Section[]) => {
    setItems(next);
    saveSections(next);
  };

  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };

  const add = (event: FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const section = { id: crypto.randomUUID().slice(0, 8), name };
    const otherIndex = items.findIndex((item) => item.id === OTHER_SECTION_ID);
    const at = otherIndex === -1 ? items.length : otherIndex;
    commit([...items.slice(0, at), section, ...items.slice(at)]);
    setNewName("");
  };

  return (
    <div className={s.editor}>
      <Reorder.Group axis="y" values={items} onReorder={setItems} className={s.list}>
        {items.map((section, index) => (
          <SectionRow
            key={section.id}
            section={section}
            onDragStart={() => setDragging(true)}
            onDragEnd={() => {
              setDragging(false);
              // The dragged order wins over any remote change that arrived mid-drag.
              setSyncedWith(saved);
              saveSections(itemsRef.current);
            }}
            onMove={(offset) => move(index, offset)}
            onRename={(name) =>
              commit(items.map((item) => (item.id === section.id ? { ...item, name } : item)))
            }
            onDelete={() => commit(items.filter((item) => item.id !== section.id))}
          />
        ))}
      </Reorder.Group>
      <form className={s.add} onSubmit={add}>
        <Input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="New section, e.g. Spices"
          aria-label="New section name"
        />
        <IconButton type="submit" label="Add section" disabled={!newName.trim()}>
          <Plus />
        </IconButton>
      </form>
    </div>
  );
}

interface SectionRowProps {
  section: Section;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (offset: number) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

function SectionRow({
  section,
  onDragStart,
  onDragEnd,
  onMove,
  onRename,
  onDelete,
}: SectionRowProps) {
  const dragControls = useDragControls();

  const onHandleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      onMove(event.key === "ArrowUp" ? -1 : 1);
    }
  };

  return (
    <Reorder.Item
      value={section}
      dragListener={false}
      dragControls={dragControls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      whileDrag={{ scale: 1.03 }}
      className={s.row}
    >
      <button
        type="button"
        className={s.handle}
        aria-label={`Move ${section.name} (use arrow keys)`}
        onPointerDown={(event) => dragControls.start(event)}
        onKeyDown={onHandleKeyDown}
      >
        <GripVertical />
      </button>
      <input
        key={section.name}
        className={s.name}
        defaultValue={section.name}
        aria-label="Section name"
        onBlur={(event) => {
          const name = event.target.value.trim();
          if (name && name !== section.name) onRename(name);
          else event.target.value = section.name;
        }}
        onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
      />
      {section.id !== OTHER_SECTION_ID && (
        <IconButton label={`Delete ${section.name}`} onClick={onDelete}>
          <X />
        </IconButton>
      )}
    </Reorder.Item>
  );
}
