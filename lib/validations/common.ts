import { z } from "zod"

export const zNumberFieldOptional = (max: number, message: string) =>
  z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined
      const num = Number(val)
      return Number.isNaN(num) ? undefined : num
    },
    z.number().max(max, { message }).optional()
  )