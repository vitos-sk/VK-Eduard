"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { AVATARS_BUCKET } from "@/modules/media/photos";
import { getSignedPhotoUrls } from "@/modules/media/signedUrls";

/** Подписанные ссылки на аватары сотрудников: `user id` → URL. Нет фото — нет ключа. */
export function useAvatarUrls(
  people: readonly { id: string; avatar_path: string | null }[],
): Readonly<Record<string, string>> {
  const supabase = useMemo(() => createClient(), []);
  const [urls, setUrls] = useState<Readonly<Record<string, string>>>({});

  const key = people.map((person) => `${person.id}:${person.avatar_path ?? ""}`).join("|");

  useEffect(() => {
    const withPhoto = people.filter((person) => person.avatar_path);
    if (withPhoto.length === 0) return;

    let cancelled = false;

    getSignedPhotoUrls(
      supabase,
      withPhoto.map((person) => person.avatar_path as string),
      AVATARS_BUCKET,
    )
      .then((signed) => {
        if (cancelled) return;

        const byUser: Record<string, string> = {};
        for (const person of withPhoto) {
          const url = signed.get(person.avatar_path as string);
          if (url) byUser[person.id] = url;
        }
        setUrls(byUser);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // `key` заменяет `people`: массив пересоздаётся на каждый рендер.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, key]);

  return urls;
}
