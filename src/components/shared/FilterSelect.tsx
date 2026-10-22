"use client";

import type { LucideIcon } from "lucide-react";

import { initialsOf } from "@/components/shared/Thumb";
import { Avatar } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectRichItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Значение пункта «всё» (все сотрудники, все объекты). */
export const ALL_FILTER = "all";

export interface FilterSelectOption {
  id: string;
  name: string;
  /** Подпись под названием: «8 змін · 66:40», адрес. */
  description?: string;
  /** Подписанная ссылка на фото (аватар сотрудника, обложка объекта); нет фото — инициалы или иконка. */
  photoUrl?: string | null;
}

interface FilterSelectProps {
  /** Иконка слева в поле и в пункте «всё»: люди или объект. */
  icon: LucideIcon;
  /** У людей в списке инициалы, у объектов — иконка. */
  avatar: "initials" | "icon";
  /** Заголовок списка и название поля для экранных дикторов. */
  label: string;
  allLabel: string;
  allDescription?: string;
  value: string;
  onChange: (id: string) => void;
  options: readonly FilterSelectOption[];
  className?: string;
}

/**
 * Поле фильтра в нашем стиле: компактное (иконка + значение), зелёная рамка, когда выбрано не «всё»; в списке
 * пункты с аватаром, названием и подписью. Один вид на «Години» и в фильтрах «Об'єкти».
 */
export function FilterSelect({
  icon: Icon,
  avatar,
  label,
  allLabel,
  allDescription,
  value,
  onChange,
  options,
  className,
}: FilterSelectProps) {
  const isActive = value !== ALL_FILTER;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="compact" active={isActive} aria-label={label} className={className}>
        <Icon className={cn("size-4", isActive ? "text-primary" : "text-ink-2")} strokeWidth={1.9} aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start" className="min-w-64">
        <SelectGroup>
          <SelectLabel>{label}</SelectLabel>
          <SelectRichItem
            value={ALL_FILTER}
            title={allLabel}
            description={allDescription}
            leading={<Avatar icon={<Icon strokeWidth={1.9} />} />}
          />
          {options.map((option) => (
            <SelectRichItem
              key={option.id}
              value={option.id}
              title={option.name}
              description={option.description}
              leading={
                avatar === "initials" ? (
                  <Avatar initials={initialsOf(option.name)} src={option.photoUrl} lazy />
                ) : (
                  <Avatar icon={<Icon strokeWidth={1.9} />} src={option.photoUrl} lazy />
                )
              }
            />
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
