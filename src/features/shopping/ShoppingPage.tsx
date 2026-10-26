import { ChevronRight, CircleCheck, Ellipsis, ListPlus, Plus, ShoppingCart } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { formatRange } from "../../lib/dates";
import { plural } from "../../lib/plural";
import { byName } from "../../lib/sort";
import { MAX_NAME_LENGTH, parseIngredientLine } from "../../lib/units";
import { Button, IconButton } from "../../ui/Button";
import { ConfirmSheet } from "../../ui/ConfirmSheet";
import { EmptyState } from "../../ui/EmptyState";
import { Input } from "../../ui/Field";
import { Page } from "../../ui/Page";
import { PageHeader } from "../../ui/PageHeader";
import { Sheet } from "../../ui/Sheet";
import { useCatalog } from "../ingredients/catalog";
import { OTHER_SECTION_ID, useSections, type Section } from "../settings/sections";
import { GenerateSheet } from "./GenerateSheet";
import { ItemRow } from "./ItemRow";
import { ItemSheet } from "./ItemSheet";
import { addManualItem, deleteItems, useShopping, type ShoppingItem } from "./shopping";
import s from "./ShoppingPage.module.css";

/** Groups items by section in store walking order. Unknown sections fall back to "Other". */
function groupBySection(items: ShoppingItem[], sections: Section[]) {
  const known = new Set(sections.map((section) => section.id));
  const bySection = new Map<string, ShoppingItem[]>();
  for (const item of [...items].sort(byName)) {
    const sectionId = known.has(item.sectionId) ? item.sectionId : OTHER_SECTION_ID;
    const sectionItems = bySection.get(sectionId);
    if (sectionItems) sectionItems.push(item);
    else bySection.set(sectionId, [item]);
  }
  return sections.flatMap((section) => {
    const sectionItems = bySection.get(section.id);
    return sectionItems ? [{ section, items: sectionItems }] : [];
  });
}

export function ShoppingPage() {
  const { items, range, loading } = useShopping();
  const sections = useSections();
  const { sectionOf } = useCatalog();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [optionsFor, setOptionsFor] = useState<string | null>(null);
  const [newItem, setNewItem] = useState("");

  const toBuy = items.filter((item) => !item.checked);
  const inCart = items.filter((item) => item.checked).sort(byName);
  const groups = groupBySection(toBuy, sections);
  const progress = items.length ? inCart.length / items.length : 0;

  const addItem = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseIngredientLine(newItem);
    if (!parsed.name) return;
    addManualItem(parsed, sectionOf(parsed.name));
    setNewItem("");
  };

  return (
    <>
      <PageHeader
        title="Shopping"
        subtitle={range ? formatRange(range.from, range.to) : undefined}
        actions={
          <>
            <IconButton label="New list from plan" onClick={() => setGenerateOpen(true)}>
              <ListPlus />
            </IconButton>
            <IconButton
              label="List options"
              onClick={() => setOptionsOpen(true)}
              disabled={items.length === 0}
            >
              <Ellipsis />
            </IconButton>
          </>
        }
      />
      <Page>
        <form className={s.addForm} onSubmit={addItem}>
          <Input
            value={newItem}
            onChange={(event) => setNewItem(event.target.value)}
            placeholder="Add item, e.g. 2 l milk"
            maxLength={MAX_NAME_LENGTH}
            aria-label="Add item"
            enterKeyHint="done"
          />
          <IconButton
            type="submit"
            label="Add item"
            className={s.addButton}
            disabled={!newItem.trim()}
          >
            <Plus />
          </IconButton>
        </form>

        {loading ? null : items.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart />}
            title="No shopping list yet"
            text="Create one from the meals you planned, or add items by hand."
          >
            <Button variant="primary" icon={<ListPlus />} onClick={() => setGenerateOpen(true)}>
              Create from plan
            </Button>
          </EmptyState>
        ) : (
          <>
            <div className={s.progress}>
              <span>
                {toBuy.length === 0 ? "All done!" : `${plural(toBuy.length, "item")} left`}
              </span>
              <div className={s.bar}>
                <motion.div
                  className={s.fill}
                  initial={false}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                />
              </div>
            </div>

            <AnimatePresence initial={false}>
              {toBuy.length === 0 && items.length > 0 && (
                <motion.div
                  key="done"
                  className={s.done}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                >
                  <CircleCheck />
                  Everything is in the cart
                </motion.div>
              )}
              {groups.map(({ section, items: sectionItems }) => (
                <motion.section
                  key={section.id}
                  layout
                  className={s.section}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <h2 className={s.sectionTitle}>
                    {section.name}
                    <span className={s.count}>{sectionItems.length}</span>
                  </h2>
                  <ul>
                    <AnimatePresence initial={false}>
                      {sectionItems.map((item) => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          onOptions={() => setOptionsFor(item.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </ul>
                </motion.section>
              ))}
            </AnimatePresence>

            {inCart.length > 0 && (
              <motion.section layout className={s.cart}>
                <button
                  type="button"
                  className={s.cartToggle}
                  aria-expanded={cartOpen}
                  onClick={() => setCartOpen((open) => !open)}
                >
                  <motion.span animate={{ rotate: cartOpen ? 90 : 0 }} className={s.chevron}>
                    <ChevronRight />
                  </motion.span>
                  In cart
                  <motion.span
                    key={inCart.length}
                    className={s.count}
                    initial={{ scale: 1.4 }}
                    animate={{ scale: 1 }}
                  >
                    {inCart.length}
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {cartOpen && (
                    <motion.ul
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className={s.cartList}
                    >
                      <AnimatePresence initial={false}>
                        {inCart.map((item) => (
                          <ItemRow
                            key={item.id}
                            item={item}
                            onOptions={() => setOptionsFor(item.id)}
                          />
                        ))}
                      </AnimatePresence>
                    </motion.ul>
                  )}
                </AnimatePresence>
              </motion.section>
            )}
          </>
        )}
      </Page>

      <GenerateSheet open={generateOpen} onClose={() => setGenerateOpen(false)} />
      <ItemSheet
        item={items.find((item) => item.id === optionsFor) ?? null}
        sections={sections}
        onClose={() => setOptionsFor(null)}
      />
      <Sheet open={optionsOpen} onClose={() => setOptionsOpen(false)} title="List options">
        <div className={s.options}>
          <Button
            block
            disabled={inCart.length === 0}
            onClick={() => {
              deleteItems(inCart);
              setOptionsOpen(false);
            }}
          >
            Remove items in cart ({inCart.length})
          </Button>
          <Button
            block
            variant="danger"
            onClick={() => {
              setOptionsOpen(false);
              setConfirmClear(true);
            }}
          >
            Clear the whole list
          </Button>
        </div>
      </Sheet>
      <ConfirmSheet
        open={confirmClear}
        title="Clear the whole list?"
        message="All items are removed, including the ones you added by hand."
        confirmLabel="Clear list"
        onConfirm={() => deleteItems(items)}
        onClose={() => setConfirmClear(false)}
      />
    </>
  );
}
