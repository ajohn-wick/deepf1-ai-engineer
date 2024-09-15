/***** CDK *****/
import { Construct } from 'constructs';
import { Stack, StackProps, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
/***** END CDK *****/

import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { bedrock } from '@cdklabs/generative-ai-cdk-constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { join } from 'path';

import { type LambdaProps, lambdaConfig, modelId } from './config';

export class DeepF1GenAIStack extends Stack {

    private _appResourcePrefix: string = 'deepf1';
    private _kbS3Prefix: string = '';
    private _kbInstruction: string = '';
    private _agentInstruction: string = '';
    private _llmFramework: string = '';

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
        const config: any = this.getConfig();
        if (config !== undefined) {
            this._kbS3Prefix = config['paths']['kb_s3_prefix'];
            this._kbInstruction = config['bedrock_instructions']['kb_instruction'];
            this._agentInstruction = config['bedrock_instructions']['agent_instruction'];
            this._llmFramework = config['llm_framework'];

            const kbBucket: s3.Bucket = this.createBucket(`${this._appResourcePrefix}-bedrock-kb`);
            new BucketDeployment(this, 'GenAIBucketDeployment', {
                sources: [Source.asset(join(__dirname, '../data/'))],
                destinationBucket: kbBucket,
                destinationKeyPrefix: this._kbS3Prefix,
            });

            const kb: bedrock.KnowledgeBase = this.createBedrockKB();
            const dataSource: bedrock.S3DataSource = this.createBedrockKBDataSource(kb, kbBucket);
            const agent: bedrock.Agent = this.createBedrockAgent(kb);
            const actionGroup: bedrock.AgentActionGroup = this.createBedrockAgentActionGroup(kb.knowledgeBaseId, this._llmFramework);
            agent.addActionGroups([actionGroup]);

            /***** INGESTION LAMBDA *****/
            const ingestionProps: LambdaProps = {
                functionName: `${this._appResourcePrefix}-ingestion`,
                runtime: lambda.Runtime.NODEJS_20_X,
                memorySize: 1024,
                entry: join(
                    __dirname,
                    '../src/adapters/primary/ingestion-lambda/ingestion-lambda.adapter.ts'
                ),
                handler: 'handler',
                timeout: Duration.seconds(600),
                architecture: lambda.Architecture.ARM_64,
                tracing: lambda.Tracing.ACTIVE,
                bundling: {
                    minify: true,
                },
                environment: {
                    DATA_SOURCE_ID: dataSource.dataSourceId,
                    KNOWLEDGE_BASE_ID: kb.knowledgeBaseId,
                    ...lambdaConfig,
                },
            };
            const ingestionLambda: NodejsFunction = this.createNodeJSLambdaFn(ingestionProps);
            // Create an s3 event source for objects being added, modified or removed
            kbBucket.addEventNotification(
                s3.EventType.OBJECT_CREATED_PUT,
                new LambdaDestination(ingestionLambda)
            );
            kbBucket.addEventNotification(
                s3.EventType.OBJECT_REMOVED,
                new LambdaDestination(ingestionLambda)
            );
            // Ensure that the lambda function can start a data ingestion job
            ingestionLambda.addToRolePolicy(
                new PolicyStatement({
                    actions: ['bedrock:StartIngestionJob'],
                    resources: [kb.knowledgeBaseArn],
                })
            );
            /***** END INGESTION LAMBDA *****/

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

    private createBedrockKB(): bedrock.KnowledgeBase {
        return new bedrock.KnowledgeBase(this, 'GenAIBedrockKB', {
            name: this._appResourcePrefix + '-kb',
            embeddingsModel: bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V2_1024,
            instruction: this._kbInstruction,
        });
    }

    private createBedrockKBDataSource(kb: bedrock.KnowledgeBase, kbBucket: s3.Bucket): bedrock.S3DataSource {
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
            foundationModel: bedrock.BedrockFoundationModel.ANTHROPIC_CLAUDE_HAIKU_V1_0,
            instruction: this._agentInstruction,
            knowledgeBases: [kb],
            enableUserInput: true,
            shouldPrepareAgent: true,
            idleSessionTTL: Duration.seconds(600)
        });
    }

    /**
    * Creates an Amazon Bedrock AgentActionGroup resource.
    *
    * @param kbId - The ID of the Amazon Bedrock knowledge base to use.
    * @param framework - The framework for the agent action group. Possible values are 'langchain' or 'llamaindex'.
    * @returns An Amazon Bedrock AgentActionGroup resource.
    */
    private createBedrockAgentActionGroup(kbId: string, framework: string): bedrock.AgentActionGroup {
        const actionGroupProps: LambdaProps = {
            functionName: `${this._appResourcePrefix}-action-group`,
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 128,
            entry: join(
                __dirname,
                `../src/actions-group/${framework}-agent-deepf1.ts`
            ),
            handler: 'handler',
            timeout: Duration.seconds(60),
            architecture: lambda.Architecture.ARM_64,
            tracing: lambda.Tracing.ACTIVE,
            bundling: {
                minify: true,
            },
            environment: {
                KNOWLEDGE_BASE_ID: kbId,
                BEDROCK_MODEL_ID: modelId,
                PROMPT_TEMPLATE: this._agentInstruction,
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
                `arn:aws:bedrock:${this.region}::foundation-model/${modelId}`
            ],
        }));

        return new bedrock.AgentActionGroup(this, 'GenAIAgentActionGroup', {
            actionGroupName: `${this._appResourcePrefix}-query-kb`,
            actionGroupExecutor: {
                lambda: actionGroupLambda
            },
            actionGroupState: "ENABLED",
            apiSchema: bedrock.ApiSchema.fromAsset(join(__dirname, '../resources/deepf1-openapi-actions-group.yaml')),
        });
    }

    private createNodeJSLambdaFn(lambdaProps: LambdaProps): NodejsFunction {
        return new NodejsFunction(this, lambdaProps.functionName.replace('-', '').toUpperCase(), lambdaProps);
    }
}