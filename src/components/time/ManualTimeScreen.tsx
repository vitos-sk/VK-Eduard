"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { uk as ukLocale } from "date-fns/locale";
import { CalendarDays, ChevronRight, Clock, Info, MapPin } from "lucide-react";
import { toast } from "sonner";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { Thumb } from "@/components/shared/Thumb";
import { EntryTypeSelector } from "@/components/time/EntryTypeSelector";
import { ObjectPickerDrawer } from "@/components/time/ObjectPickerDrawer";
import { PhotoPicker } from "@/components/time/PhotoPicker";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { fmt, formatDateShort, minutesBetween } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getObjectById } from "@/lib/mock/objects";
import { TODAY } from "@/lib/mock/user";
import type { TimeEntryKind } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Больше шести фото к записи не прикрепляем — счётчик «0/6» на макете. */
const MAX_PHOTOS = 6;

/** Значения по умолчанию — те же, что на макете. */
const DEFAULT_START = "13:30";
const DEFAULT_END = "16:00";

interface ManualTimeScreenProps {
  /** Предвыбранный тип записи: `outside` приходит из `?type=outside`. */
  defaultKind: TimeEntryKind;
}

/**
 * Экран «Додати час вручну». Форма живёт в локальном стейте:
 * «Зберегти запис» показывает тост и возвращает на «Години», никуда не сохраняя.
 */
export function ManualTimeScreen({ defaultKind }: ManualTimeScreenProps) {
  const router = useRouter();

  const [kind, setKind] = useState<TimeEntryKind>(defaultKind);
  const [objectId, setObjectId] = useState<string | null>(null);
  const [date, setDate] = useState<Date>(TODAY);
  const [startAt, setStartAt] = useState(DEFAULT_START);
  const [endAt, setEndAt] = useState(DEFAULT_END);
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<readonly string[]>([]);
  const [withGeolocation, setWithGeolocation] = useState(false);
  const [isObjectPickerOpen, setIsObjectPickerOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const selectedObject = objectId ? getObjectById(objectId) : undefined;

  const durationMin = minutesBetween(startAt, endAt);
  const isValid = durationMin > 0;
  const durationLabel = isValid
    ? fmt(t.manualTime.durationValue, {
        hours: Math.floor(durationMin / 60),
        minutes: durationMin % 60,
      })
    : t.common.dash;

  const addPhoto = () => {
    setPhotos((current) =>
      current.length >= MAX_PHOTOS
        ? current
        : [...current, `photo-${Date.now()}`],
    );
  };

  const removePhoto = (id: string) => {
    setPhotos((current) => current.filter((photo) => photo !== id));
  };

  const handleSubmit = () => {
    toast(t.manualTime.saved);
    router.push("/hours");
  };

  return (
    <div className="pb-6">
      <BackHeader title={t.manualTime.title} onBack={() => router.back()} />

      <div className="space-y-6 px-4">
        <p className="flex items-start gap-3 rounded-[16px] border border-border bg-surface p-4 text-[13px] leading-[1.4] font-medium text-text-muted">
          <Info className="size-5 shrink-0 text-brand" strokeWidth={2} aria-hidden />
          {t.manualTime.hint}
        </p>

        <Field label={t.manualTime.entryType}>
          <EntryTypeSelector value={kind} onChange={setKind} />
        </Field>

        <Field label={t.manualTime.objectLabel}>
          <button
            type="button"
            onClick={() => setIsObjectPickerOpen(true)}
            className={cn(
              "flex min-h-[68px] w-full items-center gap-3 rounded-[16px] border border-border bg-surface p-3 text-left",
              "transition-transform duration-150 active:scale-[0.98]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            )}
          >
            {selectedObject ? (
              <>
                <Thumb
                  name={selectedObject.name}
                  gradient={selectedObject.gradient}
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold">
                    {selectedObject.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] font-medium text-text-muted">
                    {selectedObject.address}
                  </span>
                </span>
              </>
            ) : (
              <span className="min-w-0 flex-1 px-1 text-[15px] font-medium text-text-muted">
                {t.manualTime.objectPlaceholder}
              </span>
            )}

            <ChevronRight
              className="size-5 shrink-0 text-text-dim"
              strokeWidth={2.4}
              aria-hidden
            />
          </button>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t.manualTime.date}>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex h-[52px] w-full items-center gap-2 rounded-[14px] px-3",
                    "border border-border bg-surface text-[15px] font-bold text-text",
                    "transition-transform duration-150 active:scale-[0.98]",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  )}
                >
                  <CalendarDays
                    className="size-5 shrink-0 text-text-muted"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span className="tabular truncate">
                    {formatDateShort(date)}
                  </span>
                </button>
              </PopoverTrigger>

              <PopoverContent
                align="start"
                className="w-auto border border-border bg-surface p-2"
              >
                <Calendar
                  mode="single"
                  selected={date}
                  defaultMonth={date}
                  onSelect={(next) => {
                    if (next) {
                      setDate(next);
                      setIsCalendarOpen(false);
                    }
                  }}
                  locale={ukLocale}
                />
              </PopoverContent>
            </Popover>
          </Field>

          <Field label={t.manualTime.duration}>
            {/* Тривалість не вводится руками — считается из початок / завершення */}
            <div className="flex h-[52px] w-full items-center gap-2 rounded-[14px] border border-border bg-surface-2 px-3 text-[15px] font-bold text-text">
              <Clock
                className="size-5 shrink-0 text-text-muted"
                strokeWidth={2}
                aria-hidden
              />
              <span className="tabular truncate">{durationLabel}</span>
            </div>
          </Field>
        </div>

        <div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.manualTime.start}>
              <TimeInput
                value={startAt}
                onChange={setStartAt}
                invalid={!isValid}
              />
            </Field>

            <Field label={t.manualTime.finish}>
              <TimeInput value={endAt} onChange={setEndAt} invalid={!isValid} />
            </Field>
          </div>

          {!isValid && (
            <p className="mt-2 text-[13px] font-medium text-danger">
              {t.manualTime.errorEndBeforeStart}
            </p>
          )}
        </div>

        <Field label={t.manualTime.description}>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder={t.manualTime.descriptionPlaceholder}
            className={cn(
              "w-full resize-none rounded-[16px] border border-border bg-surface p-4",
              "text-[15px] leading-[1.4] font-medium text-text placeholder:text-text-dim",
              "outline-none focus-visible:border-brand",
            )}
          />
        </Field>

        <PhotoPicker
          photos={photos}
          max={MAX_PHOTOS}
          onAdd={addPhoto}
          onRemove={removePhoto}
        />

        <Field label={t.manualTime.geolocation}>
          <label className="flex min-h-[60px] w-full items-center gap-3 rounded-[16px] border border-border bg-surface p-4">
            <MapPin
              className="size-5 shrink-0 text-text-muted"
              strokeWidth={2}
              aria-hidden
            />
            <span className="min-w-0 flex-1 text-[15px] font-medium text-text">
              {t.manualTime.addGeolocation}
            </span>
            <Switch
              checked={withGeolocation}
              onCheckedChange={setWithGeolocation}
              className="h-6 w-11 [&>[data-slot=switch-thumb]]:size-5"
            />
          </label>
        </Field>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid}
          className={cn(
            "flex h-[56px] w-full items-center justify-center rounded-[14px]",
            "bg-brand text-[15px] font-bold text-brand-ink",
            "transition-transform duration-150 active:scale-[0.98]",
            "disabled:pointer-events-none disabled:opacity-40",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          )}
        >
          {t.manualTime.submit}
        </button>
      </div>

      <ObjectPickerDrawer
        open={isObjectPickerOpen}
        onOpenChange={setIsObjectPickerOpen}
        value={objectId}
        onSelect={setObjectId}
      />
    </div>
  );
}

/** Подпись поля формы над содержимым. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-text-muted">{label}</p>
      {children}
    </div>
  );
}

/** `<input type="time">`, приведённый к тёмной теме: белые цифры, светлая иконка. */
function TimeInput({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}) {
  return (
    <input
      type="time"
      value={value}
      aria-invalid={invalid}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "tabular h-[52px] w-full rounded-[14px] border bg-surface px-3",
        "text-[15px] font-bold text-text outline-none",
        "[&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:invert",
        invalid ? "border-danger" : "border-border focus-visible:border-brand",
      )}
    />
  );
}
