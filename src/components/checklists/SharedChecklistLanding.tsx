"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Link2Off } from "lucide-react";
import { toast } from "sonner";

import { BackHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { StickyActionBar } from "@/components/shared/FormParts";
import { Button } from "@/components/ui/button";
import { CheckMark } from "@/components/ui/checkbox";
import { Ticket, TicketSection } from "@/components/ui/ticket";
import { fmt, pluralize } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import { acceptChecklist } from "@/modules/checklists/actions";
import type { SharedChecklistPreview } from "@/modules/checklists/queries";

/** Сколько пунктов показываем до нажатия «Додати собі». */
const PREVIEW_ITEMS = 5;

/** `/c/[token]`: страница по ссылке из WhatsApp. Ссылка не подошла (или чужая фирма) — `preview` равен `null`. */
export function SharedChecklistLanding({ token, preview }: { token: string; preview: SharedChecklistPreview | null }) {
  const t = useT();
  const locale = useLocale();
  const l = t.checklists.landing;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!preview) {
    return (
      <div className="pb-6 lg:mx-auto lg:max-w-[640px]">
        <BackHeader title={t.checklists.title} href="/" />
        <EmptyState icon={Link2Off} title={l.invalidTitle} description={l.invalidHint} />
      </div>
    );
  }

  const shown = preview.items.slice(0, PREVIEW_ITEMS);
  const rest = preview.items.length - shown.length;

  function handleAdd() {
    startTransition(async () => {
      const result = await acceptChecklist(token);

      if (result.error) {
        toast(result.error);
        return;
      }

      router.push(`/checklists/${result.copyId}`);
    });
  }

  return (
    <div className="pb-2 lg:mx-auto lg:max-w-[640px]">
      <BackHeader title={t.checklists.title} href="/" />

      <div className="space-y-3 px-4 lg:px-0">
        <div>
          <h2 className="text-[22px] leading-tight font-semibold tracking-tight">{fmt(l.title, { name: preview.authorName })}</h2>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {[preview.title, preview.siteName, pluralize(preview.items.length, locale, t.checklists.count)].filter(Boolean).join(" · ")}
          </p>
        </div>

        <Ticket variant="sections">
          {shown.map((text, index) => (
            <TicketSection key={index} className="flex min-h-12 items-center gap-3">
              <CheckMark checked={false} />
              <span className="min-w-0 flex-1 text-[15px] font-medium">{text}</span>
            </TicketSection>
          ))}
          {rest > 0 && (
            <TicketSection className="text-[13px] text-ink-2">{fmt(l.more, { n: rest })}</TicketSection>
          )}
        </Ticket>

        <p className="text-[13px] text-ink-2">{preview.myCopyId ? l.have : fmt(l.note, { name: preview.authorName })}</p>
      </div>

      <StickyActionBar>
        {preview.myCopyId ? (
          <Button asChild block>
            <Link href={`/checklists/${preview.myCopyId}`}>{l.open}</Link>
          </Button>
        ) : (
          <Button block loading={isPending} onClick={handleAdd}>
            {l.add}
          </Button>
        )}
      </StickyActionBar>
    </div>
  );
}
