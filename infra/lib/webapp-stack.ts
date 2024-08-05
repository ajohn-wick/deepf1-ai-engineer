/***** CDK *****/
import { Construct } from 'constructs';
import { Stack, StackProps, Fn, Duration } from 'aws-cdk-lib';
/***** END CDK *****/

import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
// import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { join } from 'path';

import { type LambdaProps, lambdaConfig, modelId } from './config';

export class DeepF1WebAppStack extends Stack {

    private _appResourcePrefix: string = 'deepf1';

    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const knowledgeBaseArn = Fn.importValue('KnowledgeBaseArnOutput');
        const knowledgeBaseId = Fn.importValue('KnowledgeBaseIdOutput');

        /***** QUERY MODEL LAMBDA *****
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
                BEDROCK_MODEL_ID: modelId,
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

        /***** INGESTION LAMBDA *****/
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

        // Create the API for our race engineers users to consume via the static website
        // const api: apigw.RestApi = this.createRESTApi(queryModelLambda);
        // new CfnOutput(this, 'WebAppRESTApiUrl', { value: api.url });
    }

    public get appResourcePrefix(): string {
        return this._appResourcePrefix;
    }

    private getConfig() {
        return this.node.tryGetContext('config');
    }

    private createNodeJSLambdaFn(lambdaProps: LambdaProps): NodejsFunction {
        return new NodejsFunction(this, lambdaProps.functionName.replace('-', '').toUpperCase(), lambdaProps);
    }

    // private createRESTApi(lambdaFn: NodejsFunction): apigw.RestApi {
    //     const restApi: apigw.RestApi = new apigw.RestApi(this, 'WebAppRestApi', {
    //         restApiName: `${this._appResourcePrefix}-rest-api`,
    //         deploy: true,
    //         endpointTypes: [apigw.EndpointType.REGIONAL],
    //         deployOptions: {
    //             stageName: 'prod',
    //             dataTraceEnabled: true,
    //             loggingLevel: apigw.MethodLoggingLevel.INFO,
    //             tracingEnabled: true,
    //             metricsEnabled: true,
    //         },
    //     });
    //     restApi.node.tryRemoveChild('Endpoint');
    //     const queries: apigw.Resource = restApi.root.addResource('deepf1');
    //     // Add the endpoint for querying our knowledge base (post) on prod/deepf1/
    //     queries.addMethod(
    //       'POST',
    //       new apigw.LambdaIntegration(lambdaFn, {
    //         proxy: true,
    //         allowTestInvoke: false,
    //       })
    //     );
    //     return restApi;
    // }
}