"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";

import { t } from "@/lib/i18n";
import { setSiteArchived } from "@/modules/sites/actions";
import { Button } from "@/components/ui/button";

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
    <Button
      variant="outline"
      block
      onClick={handleClick}
      loading={isPending}
      className={className}
    >
      <Icon className="size-[18px]" strokeWidth={2} aria-hidden />
      {isArchived ? t.objects.detail.restore : t.objects.detail.archive}
    </Button>
  );
}
