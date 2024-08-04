import {
    BedrockAgentRuntimeClient,
    RetrieveAndGenerateCommand,
    RetrieveAndGenerateCommandInput,
    RetrieveAndGenerateCommandOutput,
} from '@aws-sdk/client-bedrock-agent-runtime';

import { config } from '@config';

const client = new BedrockAgentRuntimeClient();
const knowledgeBaseId = config.get('knowledgeBaseId');

export async function queryModel(prompt: string): Promise<string> {
    const input: RetrieveAndGenerateCommandInput = {
        input: {
            text: prompt,
        },
        retrieveAndGenerateConfiguration: {
            type: 'KNOWLEDGE_BASE',
            knowledgeBaseConfiguration: {
                knowledgeBaseId: knowledgeBaseId,
                modelArn: 'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0',
            },
        },
    };
    const command: RetrieveAndGenerateCommand = new RetrieveAndGenerateCommand(
        input
    );
    const response: RetrieveAndGenerateCommandOutput = await client.send(command);
    return response.output?.text as string;
}
