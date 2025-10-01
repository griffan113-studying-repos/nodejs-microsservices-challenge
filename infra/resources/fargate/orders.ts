import * as docker from "@pulumi/docker"
import * as pulumi from "@pulumi/pulumi"
import * as awsx from "@pulumi/awsx"

const config = new pulumi.Config()

import { authToken, ordersECRRepository } from "../ecr/orders"
import { cluster } from "../ecs/cluster"
import { amqpListener } from "./rabbitmq"
import { appLoadBalancer } from "../app-load-balancer/load-balancer"

// Target Group é um grupo de destinos (containers) que receberão o tráfego do load balancer
export const ordersAdminTargetGroup = appLoadBalancer.createTargetGroup(
  "orders-target-group",
  {
    port: 3001,
    protocol: "HTTP",
    healthCheck: {
      path: "/health",
      protocol: "HTTP",
    },
  }
)

// Listener é responsável por escutar as requisições na porta 3001 e direcioná-las para o target group
export const ordersAdminHttpListener = appLoadBalancer.createListener(
  "orders-http-listener",
  {
    port: 3001,
    protocol: "HTTP",
    targetGroup: ordersAdminTargetGroup,
  }
)

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
            value: pulumi.interpolate`amqp://admin:admin@${amqpListener.endpoint.hostname}:${amqpListener.endpoint.port}`,
          },
          {
            name: "DATABASE_URL",
            value: config.requireSecret("orders_database_url"),
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
            value: config.requireSecret("orders_grafana_headers"),
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
          {
            name: "OTEL_NODE_ENABLE_INSTRUMENTATIONS",
            value: "http,fastify,pg,amqplib",
          },
        ],
        portMappings: [ordersAdminHttpListener],
      },
    },
  }
)

export const ordersServiceId = ordersService.service.id
