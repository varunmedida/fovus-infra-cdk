import {
  EC2Client,
  RunInstancesCommand,
  TerminateInstancesCommand,
  waitUntilInstanceStatusOk,
} from '@aws-sdk/client-ec2';
import { IAMClient } from '@aws-sdk/client-iam';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export const handler = async (event: any) => {
  let filePath = event.Records[0].dynamodb.NewImage.filePath?.S;
  let text = event.Records[0].dynamodb.NewImage.text?.S;
  const [bucketName, filename] = filePath.split('/');

  console.log('This is the filepath:' + filename);
  console.log('This is the text:' + text);

  const ec2 = new EC2Client({ region: 'us-east-1' });
  const s3 = new S3Client({});
  const iam = new IAMClient();
  const keyName = 'fovuskeypair';
  const securityGroup = 'FovusSecurityGroup';
  const imageId = 'ami-07caf09b362be10b8';
  const instanceType = 't2.micro';
  const instanceProfileName = 'FovusS3AccessRole';

  const putScript = new PutObjectCommand({
    Bucket: 'fovus-files',
    Key: 'script.sh',
    Body: `#!/bin/bash

  # Check if all required arguments are provided
  if [ $# -ne 2 ]; then
      echo "Usage: $0 <file_name> <text>"
      exit 1
  fi

  # Extract arguments
  file_name="$1"
  text="$2"

  # Concatenate text to the file
  echo "$\{text\}" >> "$\{file_name\}"

  # Check if concatenation was successful
  if [ $? -eq 0 ]; then
      echo "Text appended to file successfully."
      exit 0
  else
      echo "Failed to append text to file."
      exit 1
  fi`,
  });

  try {
    const response = await s3.send(putScript);
    console.log(response);
  } catch (err) {
    console.error(err);
  }

  try {
    console.log('Were are at line 58');
    const command = new RunInstancesCommand({
      // Your key pair name.
      KeyName: keyName,
      // Your security group.
      SecurityGroups: [securityGroup],
      // An x86_64 compatible image.
      ImageId: imageId,
      // An x86_64 compatible free-tier instance type.
      InstanceType: instanceType,
      UserData: Buffer.from(
        `#!/bin/bash
        aws s3 cp s3://${bucketName}/script.sh ./
  aws s3 cp s3://${bucketName}/${filename} ./
  chmod +x script.sh
  ./script.sh "${filename}" "${text}"
  aws s3 cp ${filename} s3://${bucketName}/${filename}_output.txt
        `
      ).toString('base64'),
      MinCount: 1,
      MaxCount: 1,
      IamInstanceProfile: {
        Name: instanceProfileName,
      },
    });
    const response = await ec2.send(command);
    console.log(response);
    console.log(response.Instances![0].InstanceId);

    console.log('Waiting for the instance to reach the running state...');
    await waitUntilInstanceStatusOk(
      { client: ec2, maxWaitTime: 500 },
      { InstanceIds: [response.Instances![0].InstanceId!] }
    );

    console.log('EC2 instance is running.');

    const terminateInstance = new TerminateInstancesCommand({
      InstanceIds: [response.Instances![0].InstanceId!],
    });
    const { TerminatingInstances } = await ec2.send(terminateInstance);
    const instanceList = TerminatingInstances!.map(
      (instance) => ` • ${instance.InstanceId}`
    );
    console.log('Terminating instances:');
    console.log(instanceList.join('\n'));
  } catch (err) {
    console.log(err);
  }
};
