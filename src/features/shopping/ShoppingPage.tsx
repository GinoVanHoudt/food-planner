import {
  ChevronRight,
  CircleCheck,
  Ellipsis,
  ListPlus,
  PackageCheck,
  Plus,
  ShoppingCart,
  WalletCards,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { formatRange } from "../../lib/dates";
import { groupInOrder } from "../../lib/group";
import { plural } from "../../lib/plural";
import { byName } from "../../lib/sort";
import { MAX_NAME_LENGTH, parseIngredientLine } from "../../lib/units";
import { Button, IconButton } from "../../ui/Button";
import { ConfirmSheet } from "../../ui/ConfirmSheet";
import { EmptyState } from "../../ui/EmptyState";
import { Input } from "../../ui/Field";
import { ListGroup } from "../../ui/ListGroup";
import { Page } from "../../ui/Page";
import { PageHeader } from "../../ui/PageHeader";
import { Sheet } from "../../ui/Sheet";
import { CardsSheet } from "../cards/CardsSheet";
import { useCatalog } from "../ingredients/catalog";
import { OTHER_SECTION_ID, useSections } from "../settings/sections";
import { GenerateSheet } from "./GenerateSheet";
import { ItemRow } from "./ItemRow";
import { ItemSheet } from "./ItemSheet";
import { PutAwaySheet } from "./PutAwaySheet";
import { addManualItem, deleteItems, useShopping, type ShoppingItem } from "./shopping";
import s from "./ShoppingPage.module.css";

export function ShoppingPage() {
  const { items, range, loading } = useShopping();
  const sections = useSections();
  const { sectionOf } = useCatalog();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [puttingAway, setPuttingAway] = useState<ShoppingItem[] | null>(null);
  const [optionsFor, setOptionsFor] = useState<string | null>(null);
  const [newItem, setNewItem] = useState("");

  const toBuy = items.filter((item) => !item.checked).sort(byName);
  const inCart = items.filter((item) => item.checked).sort(byName);
  // In store walking order; items in a deleted section show under "Other".
  const groups = groupInOrder(toBuy, sections, (item) => item.sectionId, OTHER_SECTION_ID);

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
            <IconButton label="Loyalty cards" onClick={() => setCardsOpen(true)}>
              <WalletCards />
            </IconButton>
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
            autoCapitalize="off"
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
            <p className={s.progress}>
              {toBuy.length === 0 ? "All done!" : `${plural(toBuy.length, "item")} left`}
            </p>

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
              {groups.map(({ group: section, items: sectionItems }) => (
                <ListGroup key={section.id} title={section.name} count={sectionItems.length}>
                  <AnimatePresence initial={false}>
                    {sectionItems.map((item) => (
                      <ItemRow key={item.id} item={item} onOptions={() => setOptionsFor(item.id)} />
                    ))}
                  </AnimatePresence>
                </ListGroup>
              ))}
            </AnimatePresence>

            {inCart.length > 0 && (
              <motion.section layout className={s.cart}>
                <div className={s.cartHeader}>
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
                  <Button size="sm" icon={<PackageCheck />} onClick={() => setPuttingAway(inCart)}>
                    Add to inventory
                  </Button>
                </div>
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
      <CardsSheet open={cardsOpen} onClose={() => setCardsOpen(false)} />
      <PutAwaySheet items={puttingAway} onClose={() => setPuttingAway(null)} />
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
