import { fastify } from "fastify";
import { z } from "zod";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";

const app = fastify().withTypeProvider<ZodTypeProvider>();

app.setSerializerCompiler(serializerCompiler);
app.setValidatorCompiler(validatorCompiler);

app.get("/health", () => {
  return { status: "OK" };
});

// Escalonamento horizontal
// Blue/Green Deployment
// -> Zero Downtime Deployment

app.post(
  "/orders",
  {
    schema: {
      body: z.object({
        amount: z.number(),
      }),
    },
  },
  (request, reply) => {
    const { amount } = request.body;

    console.log(`[Orders] New order received for amount: ${amount}`);

    return reply.status(201).send();
  }
);

app.listen({ host: "0.0.0.0", port: 3001 }).then(() => {
  console.log("[Orders] HTTP server running on http://localhost:3001");
});
