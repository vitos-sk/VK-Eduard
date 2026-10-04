"use client";

import { useRef } from "react";

/**
 * Два скритих `<input type="file">`: камера (`capture`) і галерея (без
 * `capture`). Один інпут із `capture={facing}` на телефоні відкриває
 * лише камеру і галерею не пропонує взагалі — тому джерел два.
 */
export function usePhotoSources(
  onFiles: (files: FileList) => void,
  multiple = true,
  /** `user` — фронтальная камера (селфи для аватара), `environment` — основная. */
  facing: "user" | "environment" = "environment",
) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (files && files.length > 0) onFiles(files);

    event.target.value = "";
  };

  const inputs = (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture={facing}
        hidden
        onChange={handle}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={handle}
      />
    </>
  );

  return {
    inputs,
    openCamera: () => cameraRef.current?.click(),
    openGallery: () => galleryRef.current?.click(),
  };
}
