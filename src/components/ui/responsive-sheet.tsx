"use client"

import * as React from "react"

import { Drawer, DrawerClose, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { Modal, ModalClose, ModalContent, ModalTitle } from "@/components/ui/modal"
import { cn } from "@/lib/utils"

/** Порог десктопной вёрстки — тот же `lg`, что и у сайдбара. */
const DESKTOP_QUERY = "(min-width: 1024px)"

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function useIsDesktop(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false
  )
}

const SheetContext = React.createContext(false)

/**
 * Лист выбора/настроек: на телефоне — нижний лист (`Drawer`), на ПК — окно
 * по центру (`Modal`). Нижний лист на широком экране выглядит чужеродно:
 * таб-бара нет, жеста «потянуть вниз» тоже.
 *
 * Заголовок и закрытие внутри берём из `SheetTitle` / `SheetClose` — они
 * сами выбирают нужный примитив.
 */
function ResponsiveSheet({
  open,
  onOpenChange,
  mobileClassName,
  desktopClassName,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Классы нижнего листа (телефон). */
  mobileClassName?: string
  /** Классы окна по центру (ПК). */
  desktopClassName?: string
  children: React.ReactNode
}) {
  const isDesktop = useIsDesktop()

  return (
    <SheetContext value={isDesktop}>
      {isDesktop ? (
        <Modal open={open} onOpenChange={onOpenChange}>
          <ModalContent
            aria-describedby={undefined}
            showCloseButton={false}
            className={cn(
              "flex max-h-[85dvh] max-w-[480px] flex-col gap-0 overflow-hidden p-0",
              desktopClassName
            )}
          >
            {children}
          </ModalContent>
        </Modal>
      ) : (
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent aria-describedby={undefined} className={mobileClassName}>
            {children}
          </DrawerContent>
        </Drawer>
      )}
    </SheetContext>
  )
}

function SheetTitle(props: React.ComponentProps<typeof ModalTitle>) {
  const isDesktop = React.useContext(SheetContext)

  return isDesktop ? <ModalTitle {...props} /> : <DrawerTitle {...props} />
}

function SheetClose(props: React.ComponentProps<typeof ModalClose>) {
  const isDesktop = React.useContext(SheetContext)

  return isDesktop ? <ModalClose {...props} /> : <DrawerClose {...props} />
}

export { ResponsiveSheet, SheetClose, SheetTitle }
