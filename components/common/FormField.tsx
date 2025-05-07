'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, AlertTriangle } from 'lucide-react';

// 入力フィールドコンポーネント（再利用性と可読性向上のため）
interface FormFieldProps {
  label: string;
  icon: React.ReactNode;
  error?: string | undefined;
  children: React.ReactNode;
  tooltip?: string;
}

export default function FormField({ label, icon, error, children, tooltip }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2 mb-4">
      <div className="flex items-center gap-2">
        {icon}
        <Label className="font-medium">{label}</Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            className="text-destructive text-sm flex items-center gap-1"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <AlertTriangle className="h-3 w-3" /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
