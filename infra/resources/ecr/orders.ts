import * as aws from "@pulumi/aws"
import * as awsx from "@pulumi/awsx"

export const ordersECRRepository = new awsx.ecr.Repository("orders-ecr", {
  forceDelete: true,
  tags: {
    "applyed-by": "pulumi",
  },
})

export const { id: registryId } = aws.ecr.getRepositoryOutput({
  name: ordersECRRepository.repository.name,
})

export const authToken = aws.ecr.getAuthorizationTokenOutput({
  registryId,
})
