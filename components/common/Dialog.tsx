'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DialogProps {
  title: string;
  description: string;
  confirmTitle?: string;
  cancelTitle?: string;
  onConfirmAction: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function Dialog({
  title,
  description,
  confirmTitle = '実行する',
  cancelTitle = 'キャンセル',
  onConfirmAction,
  open,
  onOpenChange,
}: DialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 外部からのopen状態管理を優先
  const isOpen = open !== undefined ? open : isDialogOpen;
  const handleOpenChange = onOpenChange || setIsDialogOpen;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border border-border">{cancelTitle}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmAction}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {confirmTitle}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
