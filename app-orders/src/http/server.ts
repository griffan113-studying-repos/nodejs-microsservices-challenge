import "@opentelemetry/auto-instrumentations-node/register"

import { trace } from "@opentelemetry/api"

import { fastify } from "fastify"
import { z } from "zod"
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod"
import fastifyCors from "@fastify/cors"
import { db } from "../db/client.ts"
import { schema } from "../db/schema/index.ts"
import { randomUUID } from "node:crypto"
import { displayOrderCreated } from "../broker/messages/order-created.ts"

import { setTimeout } from "node:timers/promises"
import { tracer } from "../tracing/tracer.ts"

const app = fastify().withTypeProvider<ZodTypeProvider>()

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)

app.register(fastifyCors, { origin: "*" })

app.get("/health", () => {
  return { status: "OK" }
})

// Escalonamento horizontal
// Blue/Green Deployment
// -> Zero Downtime Deployment

app.post(
  "/orders",
  {
    schema: {
      body: z.object({
        amount: z.coerce.number(),
        customerId: z.uuid(),
      }),
    },
  },
  async (request, reply) => {
    const { amount, customerId } = request.body

    console.log(`[Orders] New order received for amount: ${amount}`)

    const orderId = randomUUID()

    try {
      await db.insert(schema.orders).values({
        id: orderId,
        amount,
        customerId,
      })
    } catch (error) {
      console.error(error)
    }

    const span = tracer.startSpan("Simulate a long task")

    await setTimeout(2000)

    span.end()

    trace.getActiveSpan()?.setAttribute("order_id", orderId)

    displayOrderCreated({ orderId, amount, customer: { id: customerId } })

    return reply.status(201).send()
  }
)

app.listen({ host: "0.0.0.0", port: 3001 }).then(() => {
  console.log("[Orders] HTTP server running on http://localhost:3001")
})
