#!/usr/bin/env node

/***** CDK *****/
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
/***** END CDK *****/

import { DeepF1GenAIStack } from '../lib/genai-stack';

const stackProps = {
    env: {
        account: process.env.AWS_ACCOUNT_ID as string,
        region: process.env.AWS_REGION as string,
    },
};
const app = new App();

const genAIStack = new DeepF1GenAIStack(app, 'DeepF1GenAIStack', {
    ...stackProps,
    description: "This stack creates a GenAI backend for our DeepF1 application"
});
