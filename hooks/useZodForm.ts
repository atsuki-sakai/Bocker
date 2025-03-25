// hooks/useZodForm.ts
import { useForm, UseFormProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export function useZodForm<TSchema extends z.ZodType>(
  schema: TSchema,
  options?: Omit<UseFormProps<z.infer<TSchema>>, "resolver">
) {
  const form = useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema),
    ...options,
  });

  return form;
}