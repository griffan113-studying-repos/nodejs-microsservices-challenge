import "@opentelemetry/auto-instrumentations-node/register"

import "../broker/subscriber.ts"

import { fastify } from "fastify"
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod"
import fastifyCors from "@fastify/cors"

const app = fastify().withTypeProvider<ZodTypeProvider>()

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)

app.register(fastifyCors, { origin: "*" })

app.get("/health", () => {
  return { status: "OK" }
})

app.listen({ host: "0.0.0.0", port: 3002 }).then(() => {
  console.log("[Invoices] HTTP server running on http://localhost:3002")
})
