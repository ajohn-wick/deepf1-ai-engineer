/***** CDK *****/
import { Construct } from 'constructs';
import { Stack, StackProps, RemovalPolicy, CfnOutput, Fn, Duration } from 'aws-cdk-lib';
/***** END CDK *****/

import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
// import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
// import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { join } from 'path';

export type LambdaProps = {
    functionName: string,
    runtime: lambda.Runtime,
    memorySize: number,
    handler: string,
    entry: any,
    timeout: Duration,
    architecture: lambda.Architecture,
    tracing?: lambda.Tracing,
    bundling?: {
        minify?: boolean
    },
    environment?: {
        [key: string]: any
    }
}

export class DeepF1WebAppStack extends Stack {

    private _appResourcePrefix: string = 'deepf1';

    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        // const staticWebsiteBucket: s3.Bucket = this.createBucket(`${this._appResourcePrefix}-webapp`);
        // new BucketDeployment(this, 'WebAppBucketDeployment', {
        //     sources: [Source.asset(join(__dirname, '../../webapp/'))],
        //     destinationBucket: staticWebsiteBucket,
        // });

        // const oai: cloudfront.OriginAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'WebAppCloudrontOAI');
        // staticWebsiteBucket.grantRead(oai);
        // const distribution: cloudfront.CloudFrontWebDistribution = this.createCloudfrontDistrib(staticWebsiteBucket, oai);
        // new CfnOutput(this, 'WebAppDistributionDomainName', {
        //     value: distribution.distributionDomainName,
        //     exportName: 'WebAppDistributionDomainName',
        // });

        const knowledgeBaseArn = Fn.importValue('KnowledgeBaseArnOutput');
        const knowledgeBaseId = Fn.importValue('KnowledgeBaseIdOutput');
        const lambdaConfig = {
            LOG_LEVEL: 'DEBUG',
            POWERTOOLS_LOGGER_LOG_EVENT: 'true',
            POWERTOOLS_LOGGER_SAMPLE_RATE: '1',
            POWERTOOLS_TRACE_ENABLED: 'enabled',
            POWERTOOLS_TRACER_CAPTURE_HTTPS_REQUESTS: 'captureHTTPsRequests',
            POWERTOOLS_SERVICE_NAME: 'DeepF1Service',
            POWERTOOLS_TRACER_CAPTURE_RESPONSE: 'captureResult',
            POWERTOOLS_METRICS_NAMESPACE: 'DeepF1',
        };

        /***** QUERY MODEL LAMBDA *****/
        const queryModelProps: LambdaProps = {
            functionName: `${this._appResourcePrefix}-query-model`,
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            entry: join(
                __dirname,
                '../src/adapters/primary/query-model/query-model.adapter.ts'
            ),
            handler: 'handler',
            timeout: Duration.seconds(180),
            architecture: lambda.Architecture.ARM_64,
            tracing: lambda.Tracing.ACTIVE,
            bundling: {
                minify: true,
            },
            environment: {
                KNOWLEDGE_BASE_ARN: knowledgeBaseArn,
                KNOWLEDGE_BASE_ID: knowledgeBaseId,
                ...lambdaConfig,
            },
        };
        const queryModelLambda: NodejsFunction = this.createNodeJSLambdaFn(queryModelProps);
        queryModelLambda.addToRolePolicy(
            new iam.PolicyStatement({
                actions: [
                    'bedrock:RetrieveAndGenerate',
                    'bedrock:Retrieve',
                    'bedrock:InvokeModel',
                ],
                resources: ['*'],
            })
        );
        /***** END QUERY MODEL LAMBDA *****/

        /***** INGESTION LAMBDA *****
        const dataSourceId = Fn.importValue('DataSourceIdOutput');
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
                DATA_SOURCE_ID: dataSourceId,
                KNOWLEDGE_BASE_ID: knowledgeBaseId,
                ...lambdaConfig,
            },
        };
        const ingestionLambda: NodejsFunction = this.createNodeJSLambdaFn(ingestionProps);
        // Create an s3 event source for objects being added, modified or removed
        const kbBucket = s3.Bucket.fromBucketName(
            this,
            'GenAIBedrockKBS3Bucket',
            `${this._appResourcePrefix}-bedrock-kb`
        );
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
            new iam.PolicyStatement({
                actions: ['bedrock:StartIngestionJob'],
                resources: [knowledgeBaseArn],
            })
        );
        /***** END INGESTION LAMBDA *****/

        const agentFunction = new NodejsFunction(
            this,
            "WebAppLangChainAgentFunction",
            {
              entry: join(__dirname, '../src/langchain/agent.ts'),
              architecture: lambda.Architecture.ARM_64,
              runtime: lambda.Runtime.NODEJS_20_X,
              timeout: Duration.seconds(60),
              bundling: {
                externalModules: [],
              },
            }
          );
          const agentFunctionUrl = agentFunction.addFunctionUrl({
            authType: lambda.FunctionUrlAuthType.AWS_IAM,
            invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
            cors: {
              allowedOrigins: ["*"],
              allowedHeaders: ['content-type', 'authorization', 'host', 'x-amz-content-sha256', 'x-amz-date', 'x-amz-security-token'],
              allowedMethods: [lambda.HttpMethod.POST],
            },
          });
      
          const bedrockModelPolicy = new iam.PolicyStatement({
            actions: ["bedrock:InvokeModelWithResponseStream"],
            effect: iam.Effect.ALLOW,
            resources: [
              "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
            ],
          });
          agentFunction.addToRolePolicy(bedrockModelPolicy);
      
          new CfnOutput(this, "agentFunctionUrlOutput", {
            value: agentFunctionUrl.url,
          });

        // Create the API for our race engineers users to consume via the static website
        const api: apigw.RestApi = this.createRESTApi(queryModelLambda);
        new CfnOutput(this, 'WebAppRESTApiUrl', { value: api.url });
    }

    public get appResourcePrefix(): string {
        return this._appResourcePrefix;
    }

    private getConfig() {
        return this.node.tryGetContext('config');
    }

    private createBucket(bucketName: string): s3.Bucket {
        const s3CorsRule: s3.CorsRule = {
            allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
            allowedOrigins: ['*'],
            allowedHeaders: ['*'],
            maxAge: 300,
        };
        const bucketNameID = bucketName.replace('-', '').toUpperCase();
        return new s3.Bucket(this, bucketNameID, {
            bucketName: bucketName.toLowerCase(),
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            accessControl: s3.BucketAccessControl.PRIVATE,
            cors: [s3CorsRule],
            autoDeleteObjects: true,
            removalPolicy: RemovalPolicy.DESTROY,
        });
    }

    private createCloudfrontDistrib(bucket: s3.Bucket, oai: cloudfront.OriginAccessIdentity): cloudfront.CloudFrontWebDistribution {
        return new cloudfront.CloudFrontWebDistribution(this, 'WebAppDistribution', {
            defaultRootObject: "index.html",
            httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
            originConfigs: [
                {
                    s3OriginSource: {
                        s3BucketSource: bucket,
                        originAccessIdentity: oai,
                    },
                    behaviors: [{ isDefaultBehavior: true }, { pathPattern: '/*', allowedMethods: cloudfront.CloudFrontAllowedMethods.GET_HEAD }]
                },
            ],
        });
    }

    private createNodeJSLambdaFn(lambdaProps: LambdaProps): NodejsFunction {
        return new NodejsFunction(this, lambdaProps.functionName.replace('-', '').toUpperCase(), lambdaProps);
    }

    private createRESTApi(lambdaFn: NodejsFunction): apigw.RestApi {
        const restApi: apigw.RestApi = new apigw.RestApi(this, 'WebAppRestApi', {
            restApiName: `${this._appResourcePrefix}-rest-api`,
            deploy: true,
            endpointTypes: [apigw.EndpointType.REGIONAL],
            deployOptions: {
                stageName: 'prod',
                dataTraceEnabled: true,
                loggingLevel: apigw.MethodLoggingLevel.INFO,
                tracingEnabled: true,
                metricsEnabled: true,
            },
        });
        restApi.node.tryRemoveChild('Endpoint');
        const queries: apigw.Resource = restApi.root.addResource('deepf1');
        // Add the endpoint for querying our knowledge base (post) on prod/deepf1/
        queries.addMethod(
          'POST',
          new apigw.LambdaIntegration(lambdaFn, {
            proxy: true,
            allowTestInvoke: false,
          })
        );
        return restApi;
    }
}