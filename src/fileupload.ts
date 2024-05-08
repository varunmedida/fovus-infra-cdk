import { APIGatewayEvent } from 'aws-lambda';
import { insert } from './dao/insert';

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

  switch (resource) {
    case '/v1/file': {
      if (httpMethod === 'POST') {
        return await insert(body);
      }
    }

    default: {
      return createResponse(500, { result: 'Error: Resource was not found!' });
    }
  }
};
