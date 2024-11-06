#!/usr/bin/env node

/***** CDK *****/
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
/***** END CDK *****/

import { DeepF1LocalStack } from '../lib/local-stack';
import { DeepF1GenAIStack } from '../lib/genai-stack';

const app = new App();

const stackProps = {
    env: {
        account: process.env.AWS_ACCOUNT_ID as string,
        region: process.env.AWS_REGION as string,
    },
};
const devEnv = process.env.DEV_ENV || "local";
if (devEnv === "local") {
    new DeepF1LocalStack(app, "DeepF1LocalStack", {
        ...stackProps,
        description: "This stack creates local AWS resources to experiment on our DeepF1 application"
    });
}
else {
    new DeepF1GenAIStack(app, 'DeepF1GenAIStack', {
        ...stackProps,
        description: "This stack creates a GenAI backend for our DeepF1 application"
    });
}
