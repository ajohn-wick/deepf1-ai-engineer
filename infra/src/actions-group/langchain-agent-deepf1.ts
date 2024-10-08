import { MetricUnit, Metrics } from '@aws-lambda-powertools/metrics';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { errorHandler, logger } from '@shared/index';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { ValidationError } from '@errors/validation-error';
import middy from '@middy/core';

import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatBedrockConverse } from "@langchain/aws";
import { AmazonKnowledgeBaseRetriever } from "@langchain/aws";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";

import { config } from '@config';

const tracer = new Tracer();
const metrics = new Metrics();
const knowledgeBaseId = config.get('knowledgeBaseId');
const modelId = config.get('modelId');
const promptTemplate = config.get('promptTemplate');

export const langchainAgentQueryKB = async (event: any, context: any) => {
    try {
        if (!event) throw new ValidationError('no event payload');
        logger.info('Received event:', JSON.stringify(event, null, 2));
        const { actionGroup, apiPath, httpMethod, inputText } = event;

        // 1. Initialize the models
        const model = new ChatBedrockConverse({
            model: modelId,
            region: process.env.AWS_REGION,
        });

        // 2. Initialize the Bedrock Knowledge Base retriever
        const retriever = new AmazonKnowledgeBaseRetriever({
            knowledgeBaseId: knowledgeBaseId,
            region: process.env.AWS_REGION,
        });
        // 3. Create the RAG chain that retrieves and combines the prompt with the documents
        const combineDocsChain = await createStuffDocumentsChain({
            llm: model,
            prompt: ChatPromptTemplate.fromMessages([
                ["system", promptTemplate],
                ["human", "Answer the question: {input}\nOnly consider the following documents as source of truth:\n\n{context}"],
            ]),
        });
        const chain = await createRetrievalChain({
            retriever: retriever,
            combineDocsChain,
        });

        // 4. Generate the result
        const response = await chain.invoke({ input: inputText });
        logger.info('Received answer:', JSON.stringify(response, null, 2));
        const responseBody = {
            'application/json': {
                body: response.answer
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

export const langchainHandler = middy(langchainAgentQueryKB)
    .use(injectLambdaContext(logger))
    .use(captureLambdaHandler(tracer))
    .use(logMetrics(metrics));
