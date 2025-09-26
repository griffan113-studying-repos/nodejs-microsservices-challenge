import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as docker from "@pulumi/docker";

export const ordersECRRepository = new awsx.ecr.Repository("orders-ecr", {
    forceDelete: true,
    tags: {
        "applyed-by": "pulumi",
    }
})

const { id: registryId } = aws.ecr.getRepositoryOutput({
    name: ordersECRRepository.repository.name,
})

const authToken = aws.ecr.getAuthorizationTokenOutput({
    registryId,
});

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

// ECS + Fargate
// Fargate: Serverless compute engine for containers
// ECS: Container orchestration service

const cluster = new awsx.classic.ecs.Cluster("orders-cluster")

export const ordersService = new awsx.classic.ecs.FargateService("orders-service", {
    cluster,
    desiredCount: 1,
    waitForSteadyState: false, // Do not wait for steady state (for faster deployments)
    taskDefinitionArgs: {
        container: {
            image: ordersDockerImage.id,
            cpu: 256,
            memory: 512,
        }
    }
})
