import { APIGatewayEvent } from 'aws-lambda';
import { IPost } from '../bin/stack-config-types';
import { insert } from './dao/insert';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const createResponse = (code: number, body: any) => {
  return {
    statusCode: code,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    isBase64Encoded: false,
    body: JSON.stringify(body),
  };
};

export const handler = async (event: APIGatewayEvent) => {
  const { resource, httpMethod, pathParameters, body } = event;

  const url = await getUploadURL(body);

  switch (resource) {
    case '/v1/file': {
      if (httpMethod === 'POST') {
        let response = await insert(body, url);
        console.log(response);
        return response;
      }
    }

    default: {
      return createResponse(500, { result: 'Error: Resource was not found!' });
    }
  }
};

async function getUploadURL(body: string | null) {
  let bodyParsed = JSON.parse(body ?? '') as IPost;
  const [bucketName, filename] = bodyParsed.filePath.split('/');

  const s3Params = {
    Bucket: bucketName,
    Key: filename,
  };

  const client = new S3Client({});
  const command = new PutObjectCommand(s3Params);
  const url = await getSignedUrl(client, command, { expiresIn: 3600 });
  console.log(url);
  return url;
}
