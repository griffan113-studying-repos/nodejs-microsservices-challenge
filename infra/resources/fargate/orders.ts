import * as docker from "@pulumi/docker"
import * as pulumi from "@pulumi/pulumi"
import * as awsx from "@pulumi/awsx"

import { authToken, ordersECRRepository } from "../ecr/orders"
import { cluster } from "../ecs/cluster"
import { rabbitMQAdminHttpListener } from "./rabbitmq"

export const ordersDockerImage = new docker.Image("orders-image", {
  imageName: pulumi.interpolate`${ordersECRRepository.url}:latest`,
  build: {
    context: "../app-orders",
    dockerfile: "../app-orders/Dockerfile",
    platform: "linux/amd64",
  },
  registry: {
    password: pulumi.secret(authToken.apply(authToken => authToken.password)),
    server: ordersECRRepository.url,
    username: authToken.apply(authToken => authToken.userName),
  },
})

export const ordersService = new awsx.classic.ecs.FargateService(
  "orders-service",
  {
    cluster,
    desiredCount: 1,
    waitForSteadyState: false, // Do not wait for steady state (for faster deployments)
    taskDefinitionArgs: {
      container: {
        image: ordersDockerImage.id,
        cpu: 256,
        memory: 512,
        environment: [
          {
            name: "BROKER_URL",
            value: pulumi.interpolate`amqp://${rabbitMQAdminHttpListener.endpoint.hostname}:${rabbitMQAdminHttpListener.endpoint.port}`
          },
          {
            name: "DATABASE_URL",
            value: pulumi.secret("orders_database_url")
          }
        ]
      },
    },
  }
)

export const ordersServiceId = ordersService.service.id