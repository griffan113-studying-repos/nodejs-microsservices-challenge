import * as docker from "@pulumi/docker"
import * as pulumi from "@pulumi/pulumi"
import * as awsx from "@pulumi/awsx"

import { authToken, ordersECRRepository } from "../ecr/orders"
import { cluster } from "../ecs/cluster"
import { amqpListener } from "./rabbitmq"

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
            value: pulumi.interpolate`amqp://${amqpListener.endpoint.hostname}:${amqpListener.endpoint.port}`,
          },
          {
            name: "DATABASE_URL",
            value: pulumi.secret("orders_database_url"),
          },
          {
            name: "OTEL_SERVICE_NAME",
            value: "orders",
          },
          {
            name: "OTEL_TRACES_EXPORTER",
            value: "otlp",
          },
          {
            name: "OTEL_EXPORTER_OTLP_ENDPOINT",
            value: "https://otlp-gateway-prod-us-east-2.grafana.net/otlp",
          },
          {
            name: "OTEL_EXPORTER_OTLP_HEADERS",
            value: pulumi.secret("orders_grafana_headers"),
          },
          {
            name: "OTEL_RESOURCE_ATTRIBUTES",
            value:
              "service.name=orders,service.namespace=nodejsmicrosservices,deployment.environment=production",
          },
          {
            name: "OTEL_NODE_RESOURCE_DETECTORS",
            value: "env,host,os",
          },
        ],
      },
    },
  }
)

export const ordersServiceId = ordersService.service.id
