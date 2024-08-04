import {
    MetricUnits,
    Metrics,
    logMetrics,
} from '@aws-lambda-powertools/metrics';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { errorHandler, logger } from '@shared/index';
import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import { ValidationError } from '@errors/validation-error';
import middy from '@middy/core';

const tracer = new Tracer();
const metrics = new Metrics();

export const agentQueryKB = async (event: any, context: any) => {
    try {
        if (!event) throw new ValidationError('no payload event');
        logger.info('Received event:', JSON.stringify(event, null, 2));
        const { agent, actionGroup, apiPath, httpMethod, parameters, requestBody } = event;

        // Execute your business logic here. For more information, refer to: https://docs.aws.amazon.com/bedrock/latest/userguide/agents-lambda.html
        const responseBody = {
            'application/json': {
                body: `The API ${apiPath} was called successfully!`
            }
        };
        metrics.addMetric('SuccessfulAgentQuery', MetricUnits.Count, 1);
        const actionResponse = {
            actionGroup,
            apiPath,
            httpMethod,
            httpStatusCode: 200,
            responseBody
        };

        const dummyApiResponse = {
            response: actionResponse,
            messageVersion: event.messageVersion
        };

        logger.info(`Response: ${dummyApiResponse}`);

        return dummyApiResponse;
    } catch (error) {
        let errorMessage = 'Unknown error';
        if (error instanceof Error) errorMessage = error.message;
        logger.error(errorMessage);

        metrics.addMetric('AgentQueryError', MetricUnits.Count, 1);

        return errorHandler(error);
    }
};

export const handler = middy(agentQueryKB)
    .use(injectLambdaContext(logger))
    .use(captureLambdaHandler(tracer))
    .use(logMetrics(metrics));
