import { orders } from "./channels/orders.ts"

orders.consume(
  "orders",
  async message => {
    if (!message) return null

    console.log("Received order:", message.content.toString())

    orders.ack(message)
  },
  { noAck: false }
)
