/***** CDK *****/
import { Construct } from 'constructs';
import { Stack, StackProps, Duration, RemovalPolicy } from 'aws-cdk-lib';
/***** END CDK *****/

import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { join } from 'path';

import { type LambdaProps, lambdaConfig } from './config';

export class DeepF1LocalStack extends Stack {

    private _appResourcePrefix: string = 'deepf1';
    private _kbS3Prefix: string = '';
    private _llm: string = '';
    private _llmFramework: string = '';

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
        const config: any = this.getConfig();
        if (config !== undefined) {
            this._kbS3Prefix = config['paths']['kb_s3_prefix'];
            this._llmFramework = config['llm_framework'];

            const kbBucket: s3.Bucket = this.createBucket(`${this._appResourcePrefix}-bedrock-kb`);
            // TODO: Upload F1 data to our local S3 bucket using the awslocal CLI
            // const actionGroup = this.createBedrockAgentActionGroup("KBID123456");

        }
    }

    public get appResourcePrefix(): string {
        return this._appResourcePrefix;
    }

    public get kbS3Prefix(): string {
        return this._kbS3Prefix;
    }

    public set kbS3Prefix(value: string) {
        this._kbS3Prefix = value;
    }

    public get llm(): string {
        return this._llm;
    }

    public set llm(value: string) {
        this._llm = value;
    }

    public get llmFramework(): string {
        return this._llmFramework;
    }

    public set llmFramework(value: string) {
        this._llmFramework = value;
    }

    private getConfig(): any {
        return this.node.tryGetContext('config');
    }

    private createBucket(bucketName: string): s3.Bucket {
        const bucketNameID = bucketName.replace('-', '').toUpperCase();
        return new s3.Bucket(this, bucketNameID, {
            bucketName: bucketName.toLowerCase(),
            autoDeleteObjects: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
            removalPolicy: RemovalPolicy.DESTROY,
        });
    }

    /**
    * Creates an Amazon Bedrock AgentActionGroup resource.
    *
    * @param kbId - The ID of the Amazon Bedrock knowledge base to use.
    * @returns An Amazon Bedrock AgentActionGroup resource.
    */
    private createBedrockAgentActionGroup(kbId: string) {
        const actionGroupProps: LambdaProps = {
            functionName: `${this._appResourcePrefix}-action-group`,
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            entry: join(
                __dirname,
                `../src/actions-group/${this._llmFramework}-agent-deepf1.ts`
            ),
            handler: `${this._llmFramework}Handler`,
            timeout: Duration.seconds(60),
            architecture: lambda.Architecture.ARM_64,
            tracing: lambda.Tracing.ACTIVE,
            bundling: {
                minify: true,
                nodeModules: ['@llamaindex/env', 'pgvector', 'pg'],
            },
            environment: {
                KNOWLEDGE_BASE_ID: kbId,
                BEDROCK_MODEL_ID: this._llm,
                PROMPT_TEMPLATE: "You are DeepF1, an AI assistant trained and designed to help the Formula 1 race engineers and strategists of the DeepF1 racing team, a fictional Formula 1 racing team. Your role is to provide data points and strategic insights about:\n - Formula 1 cars performances characteristics and settings\n- Competitors' tyre choices and wear patterns\n- Pitstop strategies\n- Weather conditions and their potential impact on race strategy\n- Track-specific considerations and historical performance data\n- Driver feedback and performance metrics\n- Regulatory considerations and their strategic implications\nYour goal is to analyze this information and offer strategic recommendations to ensure victory for the DeepF1 racing team. When responding to queries, prioritize accuracy, timeliness, and actionable insights that can give DeepF1 a competitive edge during races and throughout the season.",
                ...lambdaConfig,
            },
        };
        const actionGroupLambda: NodejsFunction = this.createNodeJSLambdaFn(actionGroupProps);
        actionGroupLambda.addToRolePolicy(new PolicyStatement({
            actions: [
                'bedrock:Retrieve',
                'bedrock:InvokeModel',
            ],
            resources: [
                `arn:aws:bedrock:${this.region}:${this.account}:knowledge-base/${kbId}`,
                `arn:aws:bedrock:${this.region}::foundation-model/${this._llm}`
            ],
        }));
    }

    private createNodeJSLambdaFn(lambdaProps: LambdaProps): NodejsFunction {
        return new NodejsFunction(this, lambdaProps.functionName.replace('-', '').toUpperCase(), lambdaProps);
    }
}