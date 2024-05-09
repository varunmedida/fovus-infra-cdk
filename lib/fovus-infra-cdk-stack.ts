import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { IFovusInfraCdkStackProps } from '../bin/stack-config-types';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class FovusInfraCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: IFovusInfraCdkStackProps) {
    super(scope, id, props);

    const ec2Vpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', {
      isDefault: true,
    });

    const dbTable = new dynamodb.Table(this, 'DbTable', {
      tableName: 'fovus-table',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const trigger = new lambda.Function(this, 'LambdaTrigger', {
      functionName: 'ec2trigger',
      description: 'triggers ec2 instance',
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'ec2trigger.handler',
      code: new lambda.AssetCode('dist/src'),
      timeout: cdk.Duration.seconds(500),
    });

    trigger.addEventSource(
      new DynamoEventSource(dbTable, {
        startingPosition: lambda.StartingPosition.LATEST,
      })
    );

    const resolver = new lambda.Function(this, 'LambdaResolver', {
      functionName: props?.lambda.name,
      description: props?.lambda.desc,
      handler: 'fileupload.handler',
      code: new lambda.AssetCode('dist/src'),
      runtime: lambda.Runtime.NODEJS_LATEST,
      environment: {
        DB_TABLE_NAME: dbTable.tableName,
      },
    });

    dbTable.grantReadWriteData(resolver);

    const integration = new apigateway.LambdaIntegration(resolver);

    const api = new apigateway.RestApi(this, 'FileUploadApi', {
      restApiName: props?.api.name,
      description: props?.api.desc,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // API Gateway Model
    const model = new apigateway.Model(this, 'Model', {
      modelName: props?.api.modelName,
      restApi: api,
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        required: ['id', 'text', 'filePath'],
        properties: {
          id: { type: apigateway.JsonSchemaType.STRING },
          text: { type: apigateway.JsonSchemaType.STRING },
          filePath: { type: apigateway.JsonSchemaType.STRING },
        },
      },
    });

    // Root Resources
    const rootResource = api.root.addResource(props?.api.rootResource ?? 'v1');

    // Open Resource and Methods
    const openResource = rootResource.addResource('file');

    ['POST'].map((method) => {
      openResource.addMethod(method, integration, {
        operationName: `${method} api to save record to DDB`,
        requestModels: { 'application/json': model },
      });
    });

    // S3 Bucket
    const bucket = new s3.Bucket(this, 'FovusFiles', {
      bucketName: 'fovus-files',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Optional: specify removal policy
      autoDeleteObjects: true, // Optional: automatically delete objects when bucket is removed
    });

    // Add CORS configuration to S3 bucket
    bucket.addCorsRule({
      allowedOrigins: ['*'], // Allow requests from any origin
      allowedMethods: [
        s3.HttpMethods.GET,
        s3.HttpMethods.PUT,
        s3.HttpMethods.POST,
        s3.HttpMethods.DELETE,
        s3.HttpMethods.HEAD,
      ],
      allowedHeaders: ['*'], // Allow any headers
    });

    const ec2TriggerPermission = new iam.PolicyStatement({
      actions: ['*'],
      resources: ['*'],
    });
    trigger.addToRolePolicy(ec2TriggerPermission);

    // Create the IAM role for S3 access
    const s3AccessRole = new iam.Role(this, 'S3AccessRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      roleName: 'FovusS3AccessRole',
    });

    // Attach a policy granting full access to S3
    s3AccessRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:*'],
        resources: ['*'], // Provide full access to all S3 resources
      })
    );

    const instanceProfile = new iam.InstanceProfile(
      this,
      'Ec2InstanceProfile',
      {
        instanceProfileName: 'FovusS3AccessRole',
        role: s3AccessRole,
      }
    );

    const ec2SecurityGroup = new ec2.SecurityGroup(this, 'FovusSecurityGroup', {
      securityGroupName: 'FovusSecurityGroup',
      vpc: ec2Vpc,
    });

    // Allow inbound traffic from anywhere on all ports
    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.allTraffic());

    const ec2KeyPair = new ec2.KeyPair(this, 'FovusKeyPair', {
      keyPairName: 'fovuskeypair',
    });
  }
}
