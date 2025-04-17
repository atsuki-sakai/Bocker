import { z } from 'zod';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const fadeIn = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

type ZodTextFieldProps<TSchema extends z.ZodTypeAny> = {
  register: UseFormRegister<z.infer<TSchema>>;
  errors: FieldErrors<z.infer<TSchema>>;
  name: string;
  label: string;
  type?: string;
  icon?: React.ReactNode;
  placeholder?: string;
  className?: string;
  required?: boolean;
  readOnly?: boolean;
};

// ZodTextField コンポーネント - 再利用可能なフォームフィールド
export default function ZodTextField({
  register,
  errors,
  name,
  label,
  type = 'text',
  icon,
  placeholder,
  className,
  required = false,
  readOnly = false,
}: ZodTextFieldProps<z.ZodType>) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <Label htmlFor={name} className="flex items-center gap-2 text-gray-700">
        <div className="scale-75">{icon}</div>
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={name}
          type={type}
          readOnly={readOnly}
          {...register(name, {
            valueAsNumber: type === 'number',
            setValueAs:
              type === 'number'
                ? (value) => {
                    if (
                      value === '' ||
                      value === undefined ||
                      value === 0 ||
                      isNaN(Number(value))
                    ) {
                      return null;
                    }
                    return Number(value);
                  }
                : undefined,
          })}
          placeholder={placeholder}
          className={`${errors[name] ? ` border-red-500 focus-visible:ring-red-500 ` : ''} ${
            readOnly ? 'focus-visible:ring-0 bg-gray-100 text-gray-500' : ''
          }`}
        />
        {readOnly && (
          <span className="text-xs text-red-500 text-nowrap tracking-wider ">※直接編集不可</span>
        )}
      </div>
      <AnimatePresence>
        {errors[name] && (
          <motion.p
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={fadeIn}
            className="mt-1 text-sm text-red-500 flex items-center gap-1"
          >
            <AlertCircle size={14} />
            {errors[name]?.message as string}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
