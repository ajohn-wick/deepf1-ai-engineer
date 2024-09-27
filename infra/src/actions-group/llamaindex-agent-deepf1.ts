import { MetricUnit, Metrics } from '@aws-lambda-powertools/metrics';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { errorHandler, logger } from '@shared/index';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { ValidationError } from '@errors/validation-error';
import middy from '@middy/core';

import {
    Settings,
    RetrieverQueryEngine,
} from "llamaindex";
import { Bedrock, AmazonKnowledgeBaseRetriever } from "@llamaindex/community";

import { config } from '@config';

const tracer = new Tracer();
const metrics = new Metrics();
const knowledgeBaseId = config.get('knowledgeBaseId');
const modelId = config.get('modelId');
const promptTemplate = config.get('promptTemplate');

export const llamaindexAgentQueryKB = async (event: any, context: any) => {
    try {
        if (!event) throw new ValidationError('no event payload');
        logger.info('Received event:', JSON.stringify(event, null, 2));
        const { actionGroup, apiPath, httpMethod, inputText } = event;

        // 1. Initialize the model
        Settings.llm = new Bedrock({
            model: modelId,
            region: process.env.AWS_REGION,
        });

        // 2. Initialize the Bedrock Knowledge Base retriever
        const vectorStore = new AmazonKnowledgeBaseRetriever({
            knowledgeBaseId: knowledgeBaseId,
            region: process.env.AWS_REGION,
        });

        // 3. Create the RAG chain that retrieves and combines the prompt with the Amazon Bedrock retriever
        Settings.prompt = promptTemplate;
        const queryEngine = new RetrieverQueryEngine(vectorStore);

        // 4. Generate the result
        const response = await queryEngine.query({ query: inputText });
        logger.info('Received answer:', JSON.stringify(response, null, 2));
        const responseBody = {
            'application/json': {
                body: response.message.content
            }
        };
        const actionResponse = {
            actionGroup,
            apiPath,
            httpMethod,
            httpStatusCode: 200,
            responseBody
        };
        metrics.addMetric('SuccessfulAgentQuery', MetricUnit.Count, 1);
        return {
            messageVersion: event.messageVersion,
            response: actionResponse,
        }
    } catch (error) {
        let errorMessage = 'Unknown error';
        if (error instanceof Error) errorMessage = error.message;
        logger.error(errorMessage);

        metrics.addMetric('AgentQueryError', MetricUnit.Count, 1);

        return errorHandler(error);
    }
};

export const llamaindexHandler = middy(llamaindexAgentQueryKB)
    .use(injectLambdaContext(logger))
    .use(captureLambdaHandler(tracer))
    .use(logMetrics(metrics));
