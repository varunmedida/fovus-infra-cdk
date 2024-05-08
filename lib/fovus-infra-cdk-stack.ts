import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { IFovusInfraCdkStackProps } from '../bin/stack-config-types';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class FovusInfraCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: IFovusInfraCdkStackProps) {
    super(scope, id, props);

    const dbTable = new dynamodb.Table(this, 'DbTable', {
      tableName: 'fovus-table',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const trigger = new lambda.Function(this, 'LambdaTrigger', {
      functionName: 'ec2trigger',
      description: 'triggers ec2 instance',
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'fovustrigger.handler',
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
  }
}
