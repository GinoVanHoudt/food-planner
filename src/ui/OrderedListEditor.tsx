import { GripVertical, Plus, X } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { insertBefore, moveItem } from "../lib/list";
import { IconButton } from "./Button";
import { Input } from "./Field";
import s from "./OrderedListEditor.module.css";

export interface ListItem {
  id: string;
  name: string;
}

interface OrderedListEditorProps {
  /** The saved list; changes from the other device show up unless a drag is in progress. */
  items: ListItem[];
  onSave: (items: ListItem[]) => void;
  /** The catch-all item: it cannot be deleted and new items are added before it. */
  fixedId: string;
  /** What an item is called in labels, e.g. "section". */
  noun: string;
  placeholder: string;
}

/** A list of names to add, rename, delete and drag into order. */
export function OrderedListEditor({
  items: saved,
  onSave,
  fixedId,
  noun,
  placeholder,
}: OrderedListEditorProps) {
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

  const commit = (next: ListItem[]) => {
    setItems(next);
    onSave(next);
  };

  const move = (index: number, offset: number) => {
    const next = moveItem(items, index, offset);
    if (next !== items) commit(next);
  };

  const add = (event: FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    commit(insertBefore(items, { id: crypto.randomUUID().slice(0, 8), name }, fixedId));
    setNewName("");
  };

  return (
    <div className={s.editor}>
      <Reorder.Group axis="y" values={items} onReorder={setItems} className={s.list}>
        {items.map((item, index) => (
          <ItemRow
            key={item.id}
            item={item}
            noun={noun}
            deletable={item.id !== fixedId}
            onDragStart={() => setDragging(true)}
            onDragEnd={() => {
              setDragging(false);
              // The dragged order wins over any remote change that arrived mid-drag.
              setSyncedWith(saved);
              onSave(itemsRef.current);
            }}
            onMove={(offset) => move(index, offset)}
            onRename={(name) =>
              commit(items.map((other) => (other.id === item.id ? { ...other, name } : other)))
            }
            onDelete={() => commit(items.filter((other) => other.id !== item.id))}
          />
        ))}
      </Reorder.Group>
      <form className={s.add} onSubmit={add}>
        <Input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder={placeholder}
          aria-label={`New ${noun} name`}
        />
        <IconButton type="submit" label={`Add ${noun}`} disabled={!newName.trim()}>
          <Plus />
        </IconButton>
      </form>
    </div>
  );
}

interface ItemRowProps {
  item: ListItem;
  noun: string;
  deletable: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (offset: number) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

function ItemRow({
  item,
  noun,
  deletable,
  onDragStart,
  onDragEnd,
  onMove,
  onRename,
  onDelete,
}: ItemRowProps) {
  const dragControls = useDragControls();

  const onHandleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      onMove(event.key === "ArrowUp" ? -1 : 1);
    }
  };

  return (
    <Reorder.Item
      value={item}
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
        aria-label={`Move ${item.name} (use arrow keys)`}
        onPointerDown={(event) => dragControls.start(event)}
        onKeyDown={onHandleKeyDown}
      >
        <GripVertical />
      </button>
      <input
        key={item.name}
        className={s.name}
        defaultValue={item.name}
        aria-label={`Name of ${noun} ${item.name}`}
        onBlur={(event) => {
          const name = event.target.value.trim();
          if (name && name !== item.name) onRename(name);
          else event.target.value = item.name;
        }}
        onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
      />
      {deletable && (
        <IconButton label={`Delete ${item.name}`} onClick={onDelete}>
          <X />
        </IconButton>
      )}
    </Reorder.Item>
  );
}
