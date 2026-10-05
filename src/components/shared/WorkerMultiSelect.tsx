"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import { SearchField } from "@/components/shared/SearchField";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckMark } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/** Поиск в списке появляется, когда сотрудников больше этого числа. */
const SEARCH_THRESHOLD = 7;

export interface WorkerOptionItem {
  id: string;
  name: string;
}

interface WorkerMultiSelectProps {
  workers: readonly WorkerOptionItem[];
  /** Выбранные id; пустой список — «все». */
  value: readonly string[];
  onChange: (ids: string[]) => void;
  label: string;
  allLabel: string;
  /** Подпись при выборе нескольких: «Обрано: 3». */
  selectedLabel: (count: number) => string;
  searchPlaceholder: string;
  className?: string;
}

/**
 * Выбор нескольких сотрудников галочками: «Усі» + список. Пустой выбор означает «все» —
 * так же, как в листе экспорта. Кнопка-поле показывает, что выбрано; список раскрывается под ней.
 */
export function WorkerMultiSelect({
  workers,
  value,
  onChange,
  label,
  allLabel,
  selectedLabel,
  searchPlaceholder,
  className,
}: WorkerMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const visibleWorkers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return query ? workers.filter((worker) => worker.name.toLowerCase().includes(query)) : workers;
  }, [workers, search]);

  const summary =
    value.length === 0
      ? allLabel
      : value.length === 1
        ? (workers.find((worker) => worker.id === value[0])?.name ?? selectedLabel(1))
        : selectedLabel(value.length);

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  };

  return (
    <div className={className}>
      <p className="text-[12px] text-ink-2">{label}</p>
      <Button
        variant="field"
        size="field"
        className="mt-1 h-ctl-md gap-2 px-3"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span className="min-w-0 flex-1 truncate text-left text-[14px] font-semibold">{summary}</span>
        <ChevronDown
          className={cn("size-5 shrink-0 text-text-muted transition-transform duration-150", isOpen && "rotate-180")}
          strokeWidth={1.9}
          aria-hidden
        />
      </Button>

      {isOpen && (
        <Card tone="muted" padding="none" className="mt-2 rounded-ctl p-1.5">
          {workers.length > SEARCH_THRESHOLD && (
            <SearchField compact className="mb-1" value={search} onChange={setSearch} placeholder={searchPlaceholder} />
          )}

          <ul className="max-h-[220px] overflow-y-auto">
            <li>
              <Row label={allLabel} checked={value.length === 0} onClick={() => onChange([])} />
            </li>
            {visibleWorkers.map((worker) => (
              <li key={worker.id}>
                <Row label={worker.name} checked={value.includes(worker.id)} onClick={() => toggle(worker.id)} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Row({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="md"
      block
      className="justify-start gap-3 rounded-md px-2.5 hover:bg-surface"
      onClick={onClick}
      aria-pressed={checked}
    >
      <CheckMark checked={checked} />
      <span className="min-w-0 flex-1 truncate text-left text-[14px] font-semibold">{label}</span>
    </Button>
  );
}
