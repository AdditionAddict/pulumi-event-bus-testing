import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { execSync } from "node:child_process";
import * as path from "path";

const compileLambda = () => {
  execSync("pnpm install", { cwd: ".", stdio: "inherit" });
  execSync("pnpm run build:lambda", { cwd: ".", stdio: "inherit" });
};
compileLambda();

const tags = {
  Project: "MyEventBridgeProject",
  Environment: "Development",
  ManagedBy: "Pulumi",
};

const eventBus = new aws.cloudwatch.EventBus("eventBus", {
  name: "test-event-bus",
  tags: {
    ...tags,
    Name: "MyEventBus",
  },
});

const eventRule = new aws.cloudwatch.EventRule("eventRule", {
  eventBusName: eventBus.name,
  eventPattern: JSON.stringify({
    source: ["hono.api"],
  }),
  tags: {
    ...tags,
    Name: "EventRule",
  },
});

const lambdaRole = new aws.iam.Role("lambdaRole", {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
    Service: "lambda.amazonaws.com",
  }),
  tags: {
    ...tags,
    Name: "LambdaExecutionRole",
  },
});

new aws.iam.RolePolicyAttachment("lambdaPolicy", {
  role: lambdaRole.name,
  policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
});

const eventHandlerLambda = new aws.lambda.Function("eventHandlerLambda", {
  runtime: aws.lambda.Runtime.NodeJS20dX,
  code: new pulumi.asset.AssetArchive({
    ".": new pulumi.asset.FileArchive(path.join(__dirname, "dist/lambda")),
  }),
  handler: "index.handler",
  role: lambdaRole.arn,
  tags: {
    ...tags,
    Name: "EventHandlerLambda",
  },
});

new aws.lambda.Permission("eventBridgeInvokeLambdaPermission", {
  action: "lambda:InvokeFunction",
  function: eventHandlerLambda.name,
  principal: "events.amazonaws.com",
  sourceArn: eventRule.arn,
});

const eventTarget = new aws.cloudwatch.EventTarget("eventTarget", {
  rule: eventRule.name,
  arn: eventHandlerLambda.arn,
  eventBusName: eventBus.name,
});

export const eventBusArn = eventBus.arn;
export const lambdaFunctionName = eventHandlerLambda.name;
