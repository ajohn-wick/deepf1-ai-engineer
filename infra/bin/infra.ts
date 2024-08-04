#!/usr/bin/env node

/***** CDK *****/
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
/***** END CDK *****/

import { DeepF1GenAIStack } from '../lib/genai-stack';
import { DeepF1WebAppStack } from '../lib/webapp-stack';

const stackProps = {
    env: {
      account: process.env.AWS_ACCOUNT_ID as string,
      region: process.env.AWS_REGION as string,
    },
  };
const app = new App();

const genAIStack = new DeepF1GenAIStack(app, 'DeepF1GenAIStack', {
    ...stackProps,
    description: "This stack creates a GenAI backend for our application"
});
const webAppStack = new DeepF1WebAppStack(app, 'DeepF1WebAppStack', {
    ...stackProps,
    description: "This stack deploys a FullStack web application to interact with our GenAI backend"
});
