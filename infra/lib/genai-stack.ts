/***** CDK *****/
import { Construct } from 'constructs';
import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
/***** END CDK *****/

import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { bedrock } from '@cdklabs/generative-ai-cdk-constructs';
// import * as iam from 'aws-cdk-lib/aws-iam';
// import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as path from 'path';


export class DeepF1GenAIStack extends Stack {

    private _appResourcePrefix: string = 'deepf1';
    private _kbS3Prefix: string = '';
    private _agentPromptTemplate: string = '';

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
        const config: any = this.getConfig();
        if (config !== undefined) {
            this._kbS3Prefix = config['paths']['kb_s3_prefix'];
            this._agentPromptTemplate = config['bedrock_instructions']['agent_prompt_template'];

            const kbBucket: Bucket = this.createBucket(`${this._appResourcePrefix}-bedrock-kb`);
            new BucketDeployment(this, 'GenAIBucketDeployment', {
                sources: [Source.asset(path.join(__dirname, '../data/'))],
                destinationBucket: kbBucket,
                destinationKeyPrefix: this._kbS3Prefix,
            });

            const kb: bedrock.KnowledgeBase = this.createBedrockKB(this._appResourcePrefix);
            const dataSource: bedrock.S3DataSource = this.createBedrockKBDataSource(kb, kbBucket);

            // const agentResourceRole: iam.Role = this.createAgentExecutionRole(kbBucket);
            // const kb: bedrock.CfnKnowledgeBase = this.createBedrockKB(agentResourceRole);
            // const dataSource: bedrock.CfnDataSource = this.createBedrockKBDataSource(kb, kbBucket);

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
    
    public get agentPromptTemplate(): string {
        return this._agentPromptTemplate;
      }
      
      public set agentPromptTemplate(value: string) {
        this._agentPromptTemplate = value;
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

    private createBedrockKB(kbInstruction: string): bedrock.KnowledgeBase {
        return new bedrock.KnowledgeBase(this, 'BedrockOpenSearchKB', {
            name: this._appResourcePrefix + '-kb',
            embeddingsModel: bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V2_1024,
            instruction: kbInstruction,
        });
    }

    private createBedrockKBDataSource(kb: bedrock.KnowledgeBase, kbBucket: Bucket): bedrock.S3DataSource {
        return new bedrock.S3DataSource(this, 'GenAIS3DataSource', {
            knowledgeBase: kb,
            bucket: kbBucket,
            inclusionPrefixes: [this._kbS3Prefix],
            dataSourceName: this._appResourcePrefix + '-dataset',
            chunkingStrategy: bedrock.ChunkingStrategy.DEFAULT,
            maxTokens: 1000,
            overlapPercentage: 20,
        });
    }

    // private createAgentExecutionRole(s3Bucket: Bucket): iam.Role {
    //     const agentResourceRole = new iam.Role(this, 'BedrockAgentExecutionRole', {
    //         roleName: this.APP_RESOURCE_PREFIX + '-agent-execution-role',
    //         assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
    //     });

    //     const policyStatements = [
    //         new iam.PolicyStatement({
    //             effect: iam.Effect.ALLOW,
    //             actions: ['bedrock:InvokeModel'],
    //             resources: [`arn:aws:bedrock:${this.region}::foundation-model/*`],
    //         }),
    //         new iam.PolicyStatement({
    //             effect: iam.Effect.ALLOW,
    //             actions: ['s3:GetObject', 's3:ListBucket'],
    //             resources: [
    //                 `arn:aws:s3:::${s3Bucket.bucketName}`,
    //                 `arn:aws:s3:::${s3Bucket.bucketName}/*`,
    //             ],
    //             conditions: {
    //                 StringEquals: {
    //                     'aws:ResourceAccount': `${this.account}`,
    //                 },
    //             },
    //         }),
    //         new iam.PolicyStatement({
    //             effect: iam.Effect.ALLOW,
    //             actions: ['bedrock:Retrieve', 'bedrock:RetrieveAndGenerate'],
    //             resources: [`arn:aws:bedrock:${this.region}:${this.account}:knowledge-base/*`],
    //             conditions: {
    //                 StringEquals: {
    //                     'aws:ResourceAccount': `${this.account}`,
    //                 },
    //             },
    //         }),
    //     ];

    //     policyStatements.forEach((statement) => {
    //         agentResourceRole.addToPolicy(statement);
    //     });

    //     return agentResourceRole;
    // }

    // private createBedrockKB(agentResourceRole: iam.Role): bedrock.CfnKnowledgeBase {
    //     const embeddingModel = bedrock.FoundationModel.fromFoundationModelId(this, 'GenAIEmbeddingModel', bedrock.FoundationModelIdentifier.AMAZON_TITAN_EMBED_TEXT_V1_2_8K);
    //     const bedrockKB = new bedrock.CfnKnowledgeBase(this, 'BedrockOpenSearchKnowledgeBase', {
    //         name: this.APP_RESOURCE_PREFIX + '-kb',
    //         roleArn: agentResourceRole.roleArn,
    //         knowledgeBaseConfiguration: {
    //             type: 'VECTOR',
    //             vectorKnowledgeBaseConfiguration: {
    //                 embeddingModelArn: embeddingModel.modelArn,
    //             },
    //         },
    //         storageConfiguration: {
    //             type: 'OPENSEARCH_SERVERLESS',
    //             opensearchServerlessConfiguration: {
    //                 collectionName: ,
    //                 fieldMapping: {
    //                     vectorField: 'bedrock-knowledge-base-default-vector',
    //                     textField: 'AMAZON_BEDROCK_TEXT_CHUNK',
    //                     metadataField: 'AMAZON_BEDROCK_METADATA',
    //                 },
    //                 vectorIndexName: 'bedrock-knowledgebase-index'
    //             },
    //         },
    //         }
    //     });
    //     return bedrockKB;
    // }

    // private createBedrockKBDataSource(kb: bedrock.CfnKnowledgeBase, bucket: Bucket): bedrock.CfnDataSource {
    //     return new bedrock.CfnDataSource(this, 'BedrockS3DataSource', {
    //         name: this.APP_RESOURCE_PREFIX + '-dataset',
    //         knowledgeBaseId: kb.attrKnowledgeBaseId,
    //         dataSourceConfiguration: {
    //             type: 'S3',
    //             s3Configuration: {
    //                 bucketArn: bucket.bucketArn,
    //                 bucketOwnerAccountId: this.account,
    //                 inclusionPrefixes: [`${this.KB_S3_PREFIX}/`],
    //             },
    //         },
    //         dataDeletionPolicy: 'RETAIN' 
    //     });
    // }
}