import * as awsx from "@pulumi/awsx"
import * as pulumi from "@pulumi/pulumi"

import { cluster } from "../ecs/cluster"
import {
  appLoadBalancer,
  networkLoadBalancer,
} from "../app-load-balancer/load-balancer"

// Target Group é um grupo de destinos (containers) que receberão o tráfego do load balancer
export const rabbitMQAdminTargetGroup = appLoadBalancer.createTargetGroup(
  "rmq-admin-target-group",
  {
    port: 15672,
    protocol: "HTTP",
    healthCheck: {
      path: "/",
      protocol: "HTTP",
    },
  }
)

// Listener é responsável por escutar as requisições na porta 15672 e direcioná-las para o target group
export const rabbitMQAdminHttpListener = appLoadBalancer.createListener(
  "rmq-admin-http-listener",
  {
    port: 15672,
    protocol: "HTTP",
    targetGroup: rabbitMQAdminTargetGroup,
  }
)

export const amqpTargetGroup = networkLoadBalancer.createTargetGroup(
  "amqp-target-group",
  {
    protocol: "TCP",
    port: 5672,
    targetType: "ip",
    healthCheck: {
      port: "5672",
      protocol: "TCP",
    },
  }
)

export const amqpListener = networkLoadBalancer.createListener(
  "amqp-listener",
  {
    port: 5672,
    protocol: "TCP",
    targetGroup: amqpTargetGroup,
  }
)

export const rabbitMQService = new awsx.classic.ecs.FargateService("rabbitmq", {
  cluster,
  desiredCount: 1,
  waitForSteadyState: false, // Do not wait for steady state (for faster deployments)
  taskDefinitionArgs: {
    container: {
      image: "rabbitmq:3-management",
      cpu: 256,
      memory: 512,
      environment: [
        { name: "RABBITMQ_DEFAULT_USER", value: "admin" },
        {
          name: "RABBITMQ_DEFAULT_PASS",
          value: "admin" /* pulumi.secret('rabbitmq_password') */,
        },
      ],
      portMappings: [rabbitMQAdminHttpListener, amqpListener],
    },
  },
})

export const rabbitMQServiceId = rabbitMQService.service.id

export const rabbitMQAdminUrl = pulumi.interpolate`http://${appLoadBalancer.listeners[0].endpoint.hostname}:15672`
