import { StackProps } from 'aws-cdk-lib';

export interface IFovusInfraCdkStackProps extends StackProps {
  uploadLambda: {
    id: string;
    name: string;
    desc: string;
    handler: string;
  };
  triggerLambda: {
    id: string;
    name: string;
    desc: string;
    handler: string;
  };
  api: {
    id: string;
    name: string;
    desc: string;
    modelName: string;
    rootResource: string;
    modelId: string;
    fileResource: string;
  };
  dynamoDb: {
    id: string;
    tableName: string;
  };
  vpc: {
    id: string;
  };
  s3Bucket: {
    id: string;
    name: string;
  };
  s3AccessRole: {
    id: string;
    roleName: string;
    service: string;
  };
  ec2InstanceProfile: {
    id: string;
    instanceProfileName: string;
  };
  ec2SecurityGroup: {
    id: string;
    securityGroupName: string;
  };
  ec2KeyPair: {
    id: string;
    keyPairName: string;
  };
}

export interface IPost {
  id: string;
  text: string;
  filePath: string;
}
