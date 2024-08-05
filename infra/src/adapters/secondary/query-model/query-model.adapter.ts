import {
    BedrockAgentRuntimeClient,
    RetrieveAndGenerateCommand,
    RetrieveAndGenerateCommandInput,
    RetrieveAndGenerateCommandOutput,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { logger } from '@shared/index';

import { config } from '@config';

const client = new BedrockAgentRuntimeClient();
const knowledgeBaseId = config.get('knowledgeBaseId');
const modelId = config.get('modelId');

export async function queryModel(prompt: string): Promise<string> {
    logger.info(`Prompt received: ${prompt}`);
    const inputCommand: RetrieveAndGenerateCommandInput = {
        input: {
            text: prompt,
        },
        retrieveAndGenerateConfiguration: {
            type: 'KNOWLEDGE_BASE',
            knowledgeBaseConfiguration: {
                knowledgeBaseId: knowledgeBaseId,
                modelArn: `arn:aws:bedrock:${process.env.AWS_REGION}::foundation-model/${modelId}`,
            },
        },
    };
    const command: RetrieveAndGenerateCommand = new RetrieveAndGenerateCommand(
        inputCommand
    );
    const response: RetrieveAndGenerateCommandOutput = await client.send(command);
    return response.output?.text as string;
}
