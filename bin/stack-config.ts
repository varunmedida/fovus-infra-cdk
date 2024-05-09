import { IFovusInfraCdkStackProps } from './stack-config-types';

const environmentConfig: IFovusInfraCdkStackProps = {
  env: {
    region: 'us-east-1',
    account: '533267389516', //These have to be changed (Give your account number)
  },
  tags: {
    Developer: 'Varun Medida',
    Application: 'CdkFovusTsInfra',
  },
  uploadLambda: {
    id: 'LambdaResolver',
    name: 'fovus-file-upload',
    desc: 'Lambda which should enter the record into DynamoDB',
    handler: 'fileupload.handler',
  },
  api: {
    id: 'FileUploadApi',
    name: 'fovus-api-gateway',
    desc: 'Rest Api Gateway used for the project',
    modelName: 'FileUploadModel',
    rootResource: 'v1',
    modelId: 'Model',
    fileResource: 'file',
  },
  dynamoDb: {
    id: 'DbTable',
    tableName: 'fovus-table',
  },
  vpc: {
    id: 'DefaultVpc',
  },
  triggerLambda: {
    id: 'LambdaTrigger',
    name: 'ec2trigger',
    desc: 'triggers ec2 instance',
    handler: 'ec2trigger.handler',
  },
  s3Bucket: {
    id: 'FovusFiles',
    name: 'fovus-files',
  },
  s3AccessRole: {
    id: 'S3AccessRole',
    roleName: 'FovusS3AccessRole',
    service: 'ec2.amazonaws.com',
  },
  ec2InstanceProfile: {
    id: 'Ec2InstanceProfile',
    instanceProfileName: 'FovusS3AccessRole',
  },
  ec2SecurityGroup: {
    id: 'FovusSecurityGroup',
    securityGroupName: 'FovusSecurityGroup',
  },
  ec2KeyPair: {
    id: 'FovusKeyPair',
    keyPairName: 'fovuskeypair',
  },
  ec2Instance: {
    imageId: 'ami-07caf09b362be10b8',
  },
};

export default environmentConfig;
