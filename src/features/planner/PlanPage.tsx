import { ChevronUp, History, ListPlus } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { addDays, dayRange, formatRange, PAST_DAYS, PLAN_DAYS, todayKey } from "../../lib/dates";
import { Button } from "../../ui/Button";
import { Page } from "../../ui/Page";
import { PageHeader } from "../../ui/PageHeader";
import { useRecipes } from "../recipes/recipes";
import { GenerateSheet } from "../shopping/GenerateSheet";
import { DayCard } from "./DayCard";
import { MealSheet, type MealTarget } from "./MealSheet";
import { usePlan } from "./plan";
import s from "./PlanPage.module.css";
import { MEALS, plannedCount } from "./types";

export function PlanPage() {
  const today = todayKey();
  const lastDay = addDays(today, PLAN_DAYS - 1);
  const navigate = useNavigate();
  const { days, loading } = usePlan();
  const { byId } = useRecipes();
  const [showPast, setShowPast] = useState(false);
  const [editing, setEditing] = useState<MealTarget | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);

  const upcoming = dayRange(today, lastDay);
  const shown = showPast ? dayRange(addDays(today, -PAST_DAYS), lastDay) : upcoming;
  const planned = plannedCount(days, upcoming);

  return (
    <>
      <PageHeader
        title="Plan"
        subtitle={`${formatRange(today, lastDay)} · ${planned}/${upcoming.length * MEALS.length} meals planned`}
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<ListPlus />}
            onClick={() => setGenerateOpen(true)}
          >
            Make list
          </Button>
        }
      />
      <Page>
        <Button
          variant="ghost"
          size="sm"
          className={s.pastToggle}
          icon={showPast ? <ChevronUp /> : <History />}
          onClick={() => setShowPast((value) => !value)}
        >
          {showPast ? "Hide past days" : "Show past week"}
        </Button>
        <div className={s.grid}>
          <AnimatePresence initial={false} mode="popLayout">
            {shown.map((day, index) => (
              <DayCard
                key={day}
                day={day}
                today={today}
                plan={days.get(day)}
                recipes={byId}
                index={index}
                // Editing before the plan has loaded would start from (and save) an empty slot.
                onEdit={(meal) => !loading && setEditing({ day, meal })}
              />
            ))}
          </AnimatePresence>
        </div>
      </Page>
      <MealSheet target={editing} onClose={() => setEditing(null)} />
      <GenerateSheet
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onCreated={() => navigate("/shopping")}
      />
    </>
  );
}
