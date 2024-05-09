import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { IPost } from '../../bin/stack-config-types';
import { createResponse } from '../fileupload';

const dynamoDB = new DynamoDB();

export async function insert(body: string | null, url: string) {
  if (!body) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'No body was provided',
      }),
    };
  }

  try {
    const bodyParsed = JSON.parse(body) as IPost;

    console.log('bodyParsed', bodyParsed);
    // Prepare the item to insert into DynamoDB
    const params = {
      TableName: 'fovus-table', // Your DynamoDB table name
      Item: {
        pk: bodyParsed.id.toString(),
        ...bodyParsed,
      },
    };

    await dynamoDB.send(new PutCommand(params));
    return createResponse(200, {
      message: 'Data inserted successfully',
      item: bodyParsed,
      url: url,
    });
  } catch (error) {
    console.error('Error:', error);
    // Return an error response
    return createResponse(500, { message: 'Internal server error' });
  }
}
