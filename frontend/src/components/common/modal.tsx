"use client";

import * as React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
  AlertCircle,
} from "lucide-react";
import type { VariantProps } from "class-variance-authority";

/**
 * Các kích thước chiều rộng phổ biến và linh hoạt cho modal
 */
export type ModalSize =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "full";

/**
 * Biến thể ngữ cảnh (dùng cho modal thông báo, xác nhận, cảnh báo)
 */
export type ModalVariant =
  | "default"
  | "destructive"
  | "warning"
  | "info"
  | "success";

const modalSizeClasses: Record<ModalSize, string> = {
  xs: "sm:max-w-xs",
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
  "4xl": "sm:max-w-4xl",
  "5xl": "sm:max-w-5xl",
  full: "sm:max-w-[calc(100vw-2.5rem)] h-[calc(100vh-2.5rem)] max-h-[calc(100vh-2.5rem)]",
};

const variantIconMap: Record<ModalVariant, React.ReactNode | null> = {
  default: null,
  destructive: <AlertCircle className="size-5" />,
  warning: <AlertTriangle className="size-5" />,
  info: <Info className="size-5" />,
  success: <CheckCircle2 className="size-5" />,
};

const variantBadgeClasses: Record<ModalVariant, string> = {
  default: "bg-muted text-foreground ring-1 ring-border/50",
  destructive: "bg-destructive/10 text-destructive ring-1 ring-destructive/20",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20",
};

/* ==========================================================================
   Compound Components (Dùng khi cần custom giao diện chi tiết)
   ========================================================================== */

export interface ModalContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogContent> {
  size?: ModalSize;
  scrollable?: boolean;
}

export function ModalContent({
  className,
  children,
  size = "md",
  showCloseButton = true,
  ...props
}: ModalContentProps) {
  return (
    <DialogContent
      showCloseButton={showCloseButton}
      className={cn(
        "p-0 gap-0 overflow-hidden flex flex-col max-h-[88vh] rounded-2xl border border-border/70 shadow-2xl bg-card text-card-foreground duration-200 outline-none",
        modalSizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </DialogContent>
  );
}

export interface ModalHeaderProps extends React.ComponentProps<"div"> {
  icon?: React.ReactNode;
  variant?: ModalVariant;
  bordered?: boolean;
}

export function ModalHeader({
  className,
  icon,
  variant = "default",
  bordered = true,
  children,
  ...props
}: ModalHeaderProps) {
  const displayIcon = icon ?? variantIconMap[variant];

  return (
    <div
      data-slot="modal-header"
      className={cn(
        "flex items-start gap-3.5 px-6 py-4 pr-12 shrink-0 select-none",
        bordered && "border-b border-border/60 bg-muted/15",
        className
      )}
      {...props}
    >
      {displayIcon && (
        <div
          className={cn(
            "size-10 rounded-xl flex shrink-0 items-center justify-center transition-colors",
            variantBadgeClasses[variant]
          )}
        >
          {displayIcon}
        </div>
      )}
      <div className="flex flex-col gap-1 min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function ModalTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogTitle>) {
  return (
    <DialogTitle
      className={cn(
        "text-base sm:text-lg font-semibold tracking-tight text-foreground leading-snug truncate",
        className
      )}
      {...props}
    />
  );
}

export function ModalDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogDescription>) {
  return (
    <DialogDescription
      className={cn(
        "text-xs sm:text-sm text-muted-foreground leading-relaxed",
        className
      )}
      {...props}
    />
  );
}

export interface ModalBodyProps extends React.ComponentProps<"div"> {
  scrollable?: boolean;
}

export function ModalBody({
  className,
  children,
  scrollable = true,
  ...props
}: ModalBodyProps) {
  return (
    <div
      data-slot="modal-body"
      className={cn(
        "px-6 py-5 flex-1 min-h-0 text-sm text-foreground",
        scrollable &&
          "overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:hsl(var(--muted-foreground)/0.2)_transparent]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface ModalFooterProps extends React.ComponentProps<"div"> {
  bordered?: boolean;
}

export function ModalFooter({
  className,
  bordered = true,
  children,
  ...props
}: ModalFooterProps) {
  return (
    <div
      data-slot="modal-footer"
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 px-6 py-3.5 shrink-0 select-none",
        bordered && "border-t border-border/60 bg-muted/20",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ==========================================================================
   All-in-One High-Level Modal Component
   ========================================================================== */

export interface ModalProps {
  // Trạng thái hiển thị
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  // Nút mở modal (Trigger)
  trigger?: React.ReactNode;

  // Header props
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: ModalVariant;
  showHeader?: boolean;
  showCloseButton?: boolean;

  // Body content
  children?: React.ReactNode;

  // Footer props
  footer?: React.ReactNode;
  showFooter?: boolean;
  confirmText?: React.ReactNode;
  cancelText?: React.ReactNode;
  onConfirm?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  onCancel?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isLoading?: boolean;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  confirmVariant?: VariantProps<typeof buttonVariants>["variant"];

  // Tùy biến kích thước & style
  size?: ModalSize;
  bordered?: boolean;
  scrollable?: boolean;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
}

/**
 * Modal Component hoàn thiện, hiện đại dựa trên shadcn ui và Base UI Dialog.
 * Cung cấp đầy đủ Header, Body (tự động scroll mượt mà), Footer và đa dạng kích cỡ tùy biến.
 */
export function Modal({
  open,
  defaultOpen,
  onOpenChange,
  trigger,

  title,
  description,
  icon,
  variant = "default",
  showHeader = true,
  showCloseButton = true,

  children,

  footer,
  showFooter = true,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isLoading = false,
  confirmDisabled = false,
  cancelDisabled = false,
  confirmVariant,

  size = "md",
  bordered = true,
  scrollable = true,
  className,
  bodyClassName,
  headerClassName,
  footerClassName,
}: ModalProps) {
  // Mặc định variant cho nút confirm: nếu variant của modal là destructive thì nút cũng destructive
  const resolvedConfirmVariant =
    confirmVariant ?? (variant === "destructive" ? "destructive" : "default");

  const hasHeader =
    showHeader && (Boolean(title) || Boolean(description) || Boolean(icon));
  const hasFooterActions = Boolean(confirmText) || Boolean(cancelText);
  const hasFooter = showFooter && (Boolean(footer) || hasFooterActions);

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    onCancel?.(e);
    if (!e.defaultPrevented) {
      onOpenChange?.(false);
    }
  };

  const handleConfirm = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onConfirm) {
      await onConfirm(e);
    }
  };

  return (
    <Dialog open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger && (
        <DialogTrigger
          render={React.isValidElement(trigger) ? trigger : undefined}
        >
          {!React.isValidElement(trigger) ? trigger : undefined}
        </DialogTrigger>
      )}

      <ModalContent
        size={size}
        showCloseButton={showCloseButton}
        className={className}
      >
        {hasHeader && (
          <ModalHeader
            icon={icon}
            variant={variant}
            bordered={bordered}
            className={headerClassName}
          >
            {title && <ModalTitle>{title}</ModalTitle>}
            {description && <ModalDescription>{description}</ModalDescription>}
          </ModalHeader>
        )}

        {children && (
          <ModalBody scrollable={scrollable} className={bodyClassName}>
            {children}
          </ModalBody>
        )}

        {hasFooter && (
          <ModalFooter bordered={bordered} className={footerClassName}>
            {footer ? (
              footer
            ) : (
              <>
                {cancelText && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isLoading || cancelDisabled}
                    className="font-medium"
                  >
                    {cancelText}
                  </Button>
                )}
                {confirmText && (
                  <Button
                    type="button"
                    variant={resolvedConfirmVariant}
                    size="sm"
                    onClick={handleConfirm}
                    disabled={isLoading || confirmDisabled}
                    className="gap-1.5 font-medium"
                  >
                    {isLoading && <Loader2 className="size-3.5 animate-spin" />}
                    {confirmText}
                  </Button>
                )}
              </>
            )}
          </ModalFooter>
        )}
      </ModalContent>
    </Dialog>
  );
}

// Re-export primitive & compound components tiện dụng
export {
  Dialog as ModalRoot,
  DialogTrigger as ModalTrigger,
  DialogClose as ModalClose,
  DialogPortal as ModalPortal,
  DialogOverlay as ModalOverlay,
};
