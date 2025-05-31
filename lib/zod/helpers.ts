import { z } from "zod"

export const zNumberFieldOptional = (max: number, message: string) => z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? undefined : Number(val),
    z.number().max(max, { message }).optional()
)