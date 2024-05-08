import { IFovusInfraCdkStackProps } from './stack-config-types';

const environmentConfig: IFovusInfraCdkStackProps = {
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
