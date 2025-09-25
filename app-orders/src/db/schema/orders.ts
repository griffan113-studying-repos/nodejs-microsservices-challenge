import { pgEnum, timestamp } from "drizzle-orm/pg-core"
import { integer, text } from "drizzle-orm/pg-core"
import { pgTable } from "drizzle-orm/pg-core"
import { customers } from "./customers.ts"

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "cancelled",
])

export const orders = pgTable("orders", {
  id: text().primaryKey(),
  customerId: text()
    .notNull()
    .references(() => customers.id),
  amount: integer().notNull(),
  status: orderStatusEnum().notNull().default("pending"),
  createdAt: timestamp().defaultNow().notNull(),
})
