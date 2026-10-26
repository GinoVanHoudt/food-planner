import { Trash } from "lucide-react";
import { formatAmounts } from "../../lib/units";
import { Button } from "../../ui/Button";
import { Chip, ChipRow } from "../../ui/Chip";
import { Sheet } from "../../ui/Sheet";
import type { Section } from "../settings/sections";
import s from "./ItemSheet.module.css";
import { deleteItems, moveToSection, type ShoppingItem } from "./shopping";

interface ItemSheetProps {
  item: ShoppingItem | null;
  sections: Section[];
  onClose: () => void;
}

export function ItemSheet({ item, sections, onClose }: ItemSheetProps) {
  return (
    <Sheet open={item !== null} onClose={onClose} title={item?.name ?? ""}>
      {item && (
        <div className={s.content}>
          {(item.amounts.length > 0 || item.sources.length > 0) && (
            <p className={s.details}>
              {formatAmounts(item.amounts)}
              {item.sources.length > 0 && <span> · for {item.sources.join(", ")}</span>}
            </p>
          )}
          <div className={s.group}>
            <h3 className={s.heading}>Store section</h3>
            <p className={s.hint}>Remembered for this ingredient in future lists.</p>
            <ChipRow>
              {sections.map((section) => (
                <Chip
                  key={section.id}
                  selected={section.id === item.sectionId}
                  onClick={() => {
                    moveToSection(item, section.id);
                    onClose();
                  }}
                >
                  {section.name}
                </Chip>
              ))}
            </ChipRow>
          </div>
          <Button
            variant="danger"
            icon={<Trash />}
            onClick={() => {
              deleteItems([item]);
              onClose();
            }}
          >
            Remove from list
          </Button>
        </div>
      )}
    </Sheet>
  );
}
