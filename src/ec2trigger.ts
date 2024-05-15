import {
  EC2Client,
  RunInstancesCommand,
  TerminateInstancesCommand,
  waitUntilInstanceStatusOk,
} from '@aws-sdk/client-ec2';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export const handler = async (event: any) => {
  const records = event.Records;
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const id = record.dynamodb.NewImage?.id?.S;
    const filePath = record.dynamodb.NewImage?.filePath?.S;
    const text = record.dynamodb.NewImage?.text?.S;

    // Now you can use the extracted values as needed
    console.log(`Record ${i + 1}:`);
    console.log(`ID: ${id}`);
    console.log(`File Path: ${filePath}`);
    console.log(`Text: ${text}`);
    console.log('---');

    if (text !== undefined) {
      let [bucketName, filename] = filePath.split('/');
      let outputFilename = filename.substring(0, filename.lastIndexOf('.'));
      console.log('This is the filepath:' + filename);
      console.log('This is the text:' + text);

      await programmaticUploadScriptToS3();

      await runInstanceAndUploadOutputFileToS3(
        bucketName,
        filename,
        text,
        id,
        outputFilename
      );
    }
  }
};

async function runInstanceAndUploadOutputFileToS3(
  bucketName: any,
  filename: any,
  text: any,
  id: string,
  outputFilename: string
) {
  const ec2 = new EC2Client({ region: 'us-east-1' });
  const keyName = 'fovuskeypair';
  const securityGroup = 'FovusSecurityGroup';
  const imageId = 'ami-07caf09b362be10b8';
  const instanceType = 't2.micro';
  const instanceProfileName = 'FovusS3AccessRole';
  const userdata = `#!/bin/bash
        aws s3 cp s3://${bucketName}/script.sh ./
  aws s3 cp s3://${bucketName}/${filename} ./
  chmod +x script.sh
  ./script.sh "${filename}" "${text}"
  aws s3 cp ${filename} s3://${bucketName}/${outputFilename}_output.txt
  aws dynamodb put-item \
    --table-name fovus-table \
    --item '{"pk": {"S": "${id}"}, "id": {"S": "${id}"}, "output_file_path": {"S": "${bucketName}/${outputFilename}_output.txt"}}'
        `;

  try {
    const command = new RunInstancesCommand({
      KeyName: keyName,
      SecurityGroups: [securityGroup],
      ImageId: imageId,
      InstanceType: instanceType,
      UserData: Buffer.from(userdata).toString('base64'),
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
      { client: ec2, maxWaitTime: 300 },
      { InstanceIds: [response.Instances![0].InstanceId!] }
    );

    console.log('EC2 instance is running.');
    await terminateInstance(response);
  } catch (err) {
    console.log(err);
  }

  async function terminateInstance(response: any) {
    const terminateInstance = new TerminateInstancesCommand({
      InstanceIds: [response.Instances![0].InstanceId!],
    });
    const { TerminatingInstances } = await ec2.send(terminateInstance);
    const instanceList = TerminatingInstances!.map(
      (instance) => ` • ${instance.InstanceId}`
    );
    console.log('Terminating instances:');
    console.log(instanceList.join('\n'));
  }
}

async function programmaticUploadScriptToS3() {
  const s3 = new S3Client({});
  const scriptContent = `#!/bin/bash

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
  fi`;

  const putScriptParams = new PutObjectCommand({
    Bucket: 'fovus-files', //Change bucket name here
    Key: 'script.sh',
    Body: scriptContent,
  });

  try {
    const response = await s3.send(putScriptParams);
    console.log(response);
  } catch (err) {
    console.error(err);
  }
}
