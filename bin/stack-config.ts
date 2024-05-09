import { IFovusInfraCdkStackProps } from './stack-config-types';

const environmentConfig: IFovusInfraCdkStackProps = {
  env: {
    region: 'us-east-1', //These have to be changed (Give your region)
    account: '533267389516', //These have to be changed (Give your account number)
  },
  tags: {
    Developer: 'Varun Medida',
    Application: 'CdkFovusTsInfra',
  },
  lambda: {
    name: 'fovus-file-upload',
    desc: 'Lambda which should enter the record into DynamoDB',
  },
  api: {
    name: 'fovus-api-gateway',
    desc: 'Rest Api Gateway used for the project',
    modelName: 'FileUploadModel',
    rootResource: 'v1',
  },
};

export default environmentConfig;
