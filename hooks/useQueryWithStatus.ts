import { useQueries } from "convex-helpers/react/cache"
import { makeUseQueryWithStatus } from "convex-helpers/react"

export const useQueryWithStatus = makeUseQueryWithStatus(useQueries)