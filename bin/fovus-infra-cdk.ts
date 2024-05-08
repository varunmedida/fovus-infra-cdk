#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FovusInfraCdkStack } from '../lib/fovus-infra-cdk-stack';
import environmentConfig from './stack-config';

const app = new cdk.App();
new FovusInfraCdkStack(app, 'FovusInfraCdkStack', environmentConfig);
