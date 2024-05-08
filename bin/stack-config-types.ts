import { StackProps } from 'aws-cdk-lib';

export interface IFovusInfraCdkStackProps extends StackProps {
  lambda: {
    name: string;
    desc: string;
  };
  api: {
    name: string;
    desc: string;
    modelName: string;
    rootResource: string;
  };
}

export interface IValidators {
  requestValidatorName: string;
  validateRequestBody: boolean;
  validateRequestParameters: boolean;
}

export interface IPost {
  id: string;
  text: string;
  filePath: string;
}
