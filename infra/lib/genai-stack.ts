/***** CDK *****/
import { Construct } from 'constructs';
import { Stack, StackProps, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
/***** END CDK *****/

import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { bedrock } from '@cdklabs/generative-ai-cdk-constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import { type LambdaProps, lambdaConfig } from './config';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { join } from 'path';

export class DeepF1GenAIStack extends Stack {

    private _appResourcePrefix: string = 'deepf1';
    private _kbS3Prefix: string = '';
    private _kbInstruction: string = '';
    private _agentInstruction: string = '';

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
        const config: any = this.getConfig();
        if (config !== undefined) {
            this._kbS3Prefix = config['paths']['kb_s3_prefix'];
            this._kbInstruction = config['bedrock_instructions']['kb_instruction'];
            this._agentInstruction = config['bedrock_instructions']['agent_instruction'];

            const kbBucket: Bucket = this.createBucket(`${this._appResourcePrefix}-bedrock-kb`);
            new BucketDeployment(this, 'GenAIBucketDeployment', {
                sources: [Source.asset(join(__dirname, '../data/'))],
                destinationBucket: kbBucket,
                destinationKeyPrefix: this._kbS3Prefix,
            });

            const kb: bedrock.KnowledgeBase = this.createBedrockKB();
            const dataSource: bedrock.S3DataSource = this.createBedrockKBDataSource(kb, kbBucket);
            const agent: bedrock.Agent = this.createBedrockAgent(kb);
            const actionGroup: bedrock.AgentActionGroup = this.createBedrockAgentActionGroup();
            agent.addActionGroups([actionGroup])

            new CfnOutput(this, 'DataSourceIdOutput', {
                value: dataSource.dataSourceId,
                exportName: 'DataSourceIdOutput',
            });
            new CfnOutput(this, 'KnowledgeBaseArnOutput', {
                value: kb.knowledgeBaseArn,
                exportName: 'KnowledgeBaseArnOutput',
            });
            new CfnOutput(this, 'KnowledgeBaseIdOutput', {
                value: kb.knowledgeBaseId,
                exportName: 'KnowledgeBaseIdOutput',
            });
            new CfnOutput(this, 'AgentIdOutput', {
                value: agent.agentId,
                exportName: 'AgentIdOutput',
            });
            new CfnOutput(this, 'AgentAliasIdOutput', {
                value: agent.aliasId || '',
                exportName: 'AgentAliasIdOutput',
            });
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

    public get kbInstruction(): string {
        return this._kbInstruction;
    }

    public set kbInstruction(value: string) {
        this._kbInstruction = value;
    }

    public get agentInstruction(): string {
        return this._agentInstruction;
    }

    public set agentInstruction(value: string) {
        this._agentInstruction = value;
    }

    private getConfig(): any {
        return this.node.tryGetContext('config');
    }

    private createBucket(bucketName: string): Bucket {
        const bucketNameID = bucketName.replace('-', '').toUpperCase();
        return new Bucket(this, bucketNameID, {
            bucketName: bucketName.toLowerCase(),
            autoDeleteObjects: true,
            encryption: BucketEncryption.S3_MANAGED,
            removalPolicy: RemovalPolicy.DESTROY,
        });
    }

    private createBedrockKB(): bedrock.KnowledgeBase {
        return new bedrock.KnowledgeBase(this, 'GenAIBedrockKB', {
            name: this._appResourcePrefix + '-kb',
            embeddingsModel: bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V2_1024,
            instruction: this._kbInstruction,
        });
    }

    private createBedrockKBDataSource(kb: bedrock.KnowledgeBase, kbBucket: Bucket): bedrock.S3DataSource {
        return new bedrock.S3DataSource(this, 'GenAIS3DataSource', {
            dataSourceName: this._appResourcePrefix + '-dataset',
            bucket: kbBucket,
            knowledgeBase: kb,
            inclusionPrefixes: [this._kbS3Prefix],
            chunkingStrategy: bedrock.ChunkingStrategy.FIXED_SIZE,
            maxTokens: 1000,
            overlapPercentage: 20,
        });
    }

    private createBedrockAgent(kb: bedrock.KnowledgeBase): bedrock.Agent {
        return new bedrock.Agent(this, 'GenAIAgent', {
            name: `${this._appResourcePrefix}-agent`,
            aliasName: `${this._appResourcePrefix}-v1`,
            foundationModel: bedrock.BedrockFoundationModel.ANTHROPIC_CLAUDE_INSTANT_V1_2,
            instruction: this._agentInstruction,
            knowledgeBases: [kb],
            enableUserInput: true,
            shouldPrepareAgent: true,
            idleSessionTTL: Duration.seconds(600)
        });
    }

    private createBedrockAgentActionGroup(): bedrock.AgentActionGroup {
        const actionGroupProps: LambdaProps = {
            functionName: `${this._appResourcePrefix}-action-group`,
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 128,
            entry: join(
                __dirname,
                '../src/actions-group/agent-deepf1.ts'
            ),
            handler: 'handler',
            timeout: Duration.seconds(60),
            architecture: lambda.Architecture.ARM_64,
            tracing: lambda.Tracing.ACTIVE,
            bundling: {
                minify: true,
            },
            environment: {
                ...lambdaConfig,
            },
        };
        const actionGroupLambda: NodejsFunction = this.createNodeJSLambdaFn(actionGroupProps);

        return new bedrock.AgentActionGroup(this, 'GenAIAgentActionGroup', {
            actionGroupName: `${this._appResourcePrefix}-query-kb`,
            actionGroupExecutor: {
                lambda: actionGroupLambda
            },
            actionGroupState: "ENABLED",
            apiSchema: bedrock.ApiSchema.fromAsset(join(__dirname, '../postman/deepf1-openapi-actions-group.yaml')),
        });
    }

    private createNodeJSLambdaFn(lambdaProps: LambdaProps): NodejsFunction {
        return new NodejsFunction(this, lambdaProps.functionName.replace('-', '').toUpperCase(), lambdaProps);
    }
}