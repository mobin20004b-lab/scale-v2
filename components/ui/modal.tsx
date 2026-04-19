'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

const Modal = Dialog.Root;
const ModalTrigger = Dialog.Trigger;
const ModalClose = Dialog.Close;

function ModalContent({ className, children, ...props }: React.ComponentProps<typeof Dialog.Content>) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px]" />
      <Dialog.Content
        className={cn(
          'fixed right-1/2 top-1/2 z-50 w-full max-w-lg translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-modal)] border border-border bg-card p-6 shadow-[var(--shadow-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
        {...props}
      >
        {children}
        <Dialog.Close className="absolute left-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-secondary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="h-4 w-4" />
          <span className="sr-only">بستن</span>
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

function ModalHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mb-4 space-y-1', className)} {...props} />;
}

function ModalTitle({ className, ...props }: React.ComponentProps<typeof Dialog.Title>) {
  return <Dialog.Title className={cn('text-lg font-semibold tracking-tight', className)} {...props} />;
}

function ModalDescription({ className, ...props }: React.ComponentProps<typeof Dialog.Description>) {
  return <Dialog.Description className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export { Modal, ModalClose, ModalContent, ModalDescription, ModalHeader, ModalTitle, ModalTrigger };
