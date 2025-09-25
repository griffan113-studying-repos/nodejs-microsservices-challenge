import { fastify } from "fastify"
import { z } from "zod"
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod"
import { channels } from "../broker/channels/index.ts"
import fastifyCors from "@fastify/cors"
import { db } from "../db/client.ts"
import { schema } from "../db/schema/index.ts"
import { randomUUID } from "node:crypto"

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

    channels.orders.sendToQueue("orders", Buffer.from("Hello World"))

    try {
      await db.insert(schema.orders).values({
        id: randomUUID(),
        amount,
        customerId,
      })
    } catch (error) {
      console.error(error)
    }

    return reply.status(201).send()
  }
)

app.listen({ host: "0.0.0.0", port: 3001 }).then(() => {
  console.log("[Orders] HTTP server running on http://localhost:3001")
})
