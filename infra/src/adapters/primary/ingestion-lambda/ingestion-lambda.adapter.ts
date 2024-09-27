import { MetricUnit, Metrics } from '@aws-lambda-powertools/metrics';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { logger } from '@shared/index';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import middy from '@middy/core';

import { ingestionLambdaUseCase } from '@use-cases/ingestion-lambda';
import { S3Event } from 'aws-lambda';

const tracer = new Tracer();
const metrics = new Metrics();

export const ingestionLambdaAdapter = async ({}: S3Event): Promise<void> => {
    try {
        logger.info('ingestion job started based on data source bucket changes');

        // call our use case to start the ingestion based on the s3 upload
        const response = await ingestionLambdaUseCase();

        logger.info(`response: ${response}`);

        metrics.addMetric('IngestionLambdaSuccess', MetricUnit.Count, 1);
    } catch (error) {
        let errorMessage = 'Unknown error';
        if (error instanceof Error) errorMessage = error.message;
        logger.error(errorMessage);

        metrics.addMetric('IngestionLambdaError', MetricUnit.Count, 1);

        throw error;
    }
};

export const handler = middy(ingestionLambdaAdapter)
    .use(injectLambdaContext(logger))
    .use(captureLambdaHandler(tracer))
    .use(logMetrics(metrics));
