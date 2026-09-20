"use client";

import { useState, useTransition } from "react";
import { UserPlus, X } from "lucide-react";

import {
  SegmentedTabs,
  type SegmentedOption,
} from "@/components/shared/SegmentedTabs";
import { t } from "@/lib/i18n";
import { createWorker } from "@/modules/team/actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Role = "worker" | "boss";

const ROLE_OPTIONS: readonly SegmentedOption<Role>[] = [
  { value: "worker", label: t.reports.team.form.roleWorker },
  { value: "boss", label: t.reports.team.form.roleBoss },
];

interface AddWorkerFormProps {
  onClose: () => void;
  /** Работника нужно перечитать из базы — вызывается сразу после успеха. */
  onCreated: () => void;
  className?: string;
}

/**
 * Форма «Додати співробітника» на вкладці «Команда» (тільки boss).
 * Пароль задає сам шеф (поле нижче) — запрошень поштою нема, тож саме
 * він і передає ці дані людині.
 */
export function AddWorkerForm({ onClose, onCreated, className }: AddWorkerFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("worker");

  const [result, setResult] = useState<{ email: string } | null>(null);

  const isValid = fullName.trim() !== "" && email.trim() !== "" && password.length >= 6;

  const handleSubmit = () => {
    setError(null);

    startTransition(async () => {
      const state = await createWorker({ fullName, email, password, role });

      if (state.error !== null) {
        setError(state.error);
        return;
      }

      setResult({ email: state.email });
      onCreated();
    });
  };

  if (result) {
    return (
      <Card className={className}>
        <p className="text-[16px] font-bold">{t.reports.team.form.createdTitle}</p>

        <dl className="mt-3 flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[13px] font-medium text-text-muted">
              {t.reports.team.form.emailLabel}
            </dt>
            <dd className="tabular text-[14px] font-bold">{result.email}</dd>
          </div>
        </dl>

        <p className="mt-3 text-[13px] leading-[1.4] font-medium text-text-muted">
          {t.reports.team.form.createdHint}
        </p>

        <div className="mt-4 flex gap-3">
          <Button className="flex-1" onClick={onClose}>
            {t.reports.team.form.close}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[16px] font-bold">
          <UserPlus className="size-5 text-primary" strokeWidth={2} aria-hidden />
          {t.reports.team.form.title}
        </p>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label={t.reports.team.form.cancel}
          className="text-text-muted"
        >
          <X className="size-5" strokeWidth={2} aria-hidden />
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <Input
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder={t.reports.team.form.namePlaceholder}
          aria-label={t.reports.team.form.nameLabel}
                  />

        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t.reports.team.form.emailPlaceholder}
          aria-label={t.reports.team.form.emailLabel}
                  />

        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t.reports.team.form.passwordPlaceholder}
          aria-label={t.reports.team.form.passwordLabel}
          autoComplete="new-password"
                  />

        <SegmentedTabs
          options={ROLE_OPTIONS}
          value={role}
          onChange={setRole}
          label={t.reports.team.form.roleLabel}
        />

        {error && <p className="text-[13px] font-semibold text-danger-fg">{error}</p>}

        <Button block onClick={handleSubmit} disabled={!isValid || isPending}>
          {t.reports.team.form.save}
        </Button>
      </div>
    </Card>
  );
}
