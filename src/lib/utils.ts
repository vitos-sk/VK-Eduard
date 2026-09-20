import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/** Учим merge токенам дизайн-системы: rounded-ctl/card/modal и h-/size-ctl-*, field. */
const CONTROL_SIZES = ["ctl-sm", "ctl-md", "ctl-lg", "ctl-xl", "field"]
const twMerge = extendTailwindMerge({
  extend: {
    theme: { radius: ["ctl", "card", "modal"] },
    classGroups: {
      h: [{ h: CONTROL_SIZES }],
      w: [{ w: CONTROL_SIZES }],
      size: [{ size: CONTROL_SIZES }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Ссылка «проложить маршрут» — открывает адрес в Google Maps как пункт назначения. */
export function getGoogleMapsDirectionsUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
}
