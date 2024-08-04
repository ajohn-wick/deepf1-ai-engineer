
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
import { queryModelUseCase } from '@use-cases/query-model';

const tracer = new Tracer();
const metrics = new Metrics();

export const agentQueryKB = async (event: any, context: any) => {
    try {
        if (!event) throw new ValidationError('no event payload');
        logger.info('Received event:', JSON.stringify(event, null, 2));
        const { actionGroup, apiPath, httpMethod, inputText } = event;

        // call our use case for querying the knowledge base
        const response = await queryModelUseCase(inputText);
        const responseBody = {
            'application/json': {
                body: response
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

        return {
            messageVersion: event.messageVersion,
            response: actionResponse,
        }
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
