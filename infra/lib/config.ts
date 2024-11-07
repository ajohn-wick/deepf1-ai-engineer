import { Duration } from 'aws-cdk-lib';
import * as lambda from "aws-cdk-lib/aws-lambda";

export type LambdaProps = {
    functionName: string,
    runtime: lambda.Runtime,
    memorySize: number,
    handler?: string,
    entry?: string,
    code?: lambda.Code,
    timeout: Duration,
    architecture: lambda.Architecture,
    tracing?: lambda.Tracing,
    bundling?: {
        minify?: boolean,
        nodeModules?: string[],
    },
    environment?: {
        [key: string]: any
    }
}

export const lambdaConfig = {
    LOG_LEVEL: 'DEBUG',
    POWERTOOLS_LOGGER_LOG_EVENT: 'true',
    POWERTOOLS_LOGGER_SAMPLE_RATE: '1',
    POWERTOOLS_TRACE_ENABLED: 'enabled',
    POWERTOOLS_TRACER_CAPTURE_HTTPS_REQUESTS: 'captureHTTPsRequests',
    POWERTOOLS_SERVICE_NAME: 'DeepF1Service',
    POWERTOOLS_TRACER_CAPTURE_RESPONSE: 'captureResult',
    POWERTOOLS_METRICS_NAMESPACE: 'DeepF1',
};