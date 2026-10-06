"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "./cn";
import { CloseIcon } from "./icons";

/**
 * A modal sheet: it rises from the bottom on phones and sits centred on wider screens.
 * The parent owns `open`, and Escape, a backdrop tap or `onClose` all route back through it.
 */
export function Sheet({
  open,
  onClose,
  labelledBy,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    dialog.showModal();
    // showModal focuses the first focusable element, even one with tabIndex -1, and browsers ring it.
    // Focusing the dialog itself avoids that, and Tab still leads into the content from here.
    dialog.focus();
    // A modal dialog doesn't stop the page behind it from scrolling.
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = overflow;
      dialog.close();
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      tabIndex={-1}
      // Escape fires `close` on the dialog itself, so route it through the parent's state.
      onClose={onClose}
      // The inner panel fills the dialog, so a click that lands on the dialog itself is on the backdrop.
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={cn(
        "m-0 mt-auto max-h-[88dvh] outline-none w-full max-w-none overflow-y-auto overscroll-contain rounded-t-[22px] border border-line bg-surface text-ink shadow-card backdrop:bg-scrim backdrop:animate-fade-in open:animate-sheet-up",
        // Rises from the bottom edge on phones, like a native sheet, and settles into place as a dialog on wider screens.
        "sm:m-auto sm:max-w-[440px] sm:rounded-[22px] sm:open:animate-scale-in",
        className,
      )}
    >
      {children}
    </dialog>
  );
}

/** The round close button in a sheet's top corner. */
export function SheetClose({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink",
        className,
      )}
    >
      <CloseIcon size={20} />
    </button>
  );
}
