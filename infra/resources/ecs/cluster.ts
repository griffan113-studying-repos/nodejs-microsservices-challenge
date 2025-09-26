import * as awsx from "@pulumi/awsx";

// ECS + Fargate
// Fargate: Serverless compute engine for containers
// ECS: Container orchestration service

export const cluster = new awsx.classic.ecs.Cluster("app-cluster")
