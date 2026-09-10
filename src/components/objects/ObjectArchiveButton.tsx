"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";

import { t } from "@/lib/i18n";
import { setSiteArchived } from "@/modules/sites/actions";
import { cn } from "@/lib/utils";

interface ObjectArchiveButtonProps {
  siteId: string;
  isArchived: boolean;
  className?: string;
}

/** Кнопка архивации/розархивації на детальній сторінці об'єкта — тільки boss. */
export function ObjectArchiveButton({
  siteId,
  isArchived,
  className,
}: ObjectArchiveButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const Icon = isArchived ? ArchiveRestore : Archive;

  const handleClick = () => {
    startTransition(async () => {
      const result = await setSiteArchived(siteId, !isArchived);

      if (result.error) {
        toast(result.error);
        return;
      }

      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "flex h-12 w-full items-center justify-center gap-2 rounded-[14px]",
        "border border-border text-[15px] font-bold text-text",
        "transition-transform duration-150 active:scale-[0.98]",
        "disabled:pointer-events-none disabled:opacity-60",
        className,
      )}
    >
      <Icon className="size-[18px]" strokeWidth={2} aria-hidden />
      {isArchived ? t.objects.detail.restore : t.objects.detail.archive}
    </button>
  );
}
