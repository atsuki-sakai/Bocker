import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";


test("reservation - getById", async () => {
  const t = convexTest();
  const reservationId = "rewqrfasfdsferwfdsafd" as Id<"reservation">
  const result = await t.query(api.reservation.query.getById, { id: reservationId});
  expect(reservationId).toBe(result?._id)
});