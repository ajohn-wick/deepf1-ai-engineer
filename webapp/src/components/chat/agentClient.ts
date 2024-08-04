import {
    BedrockAgentRuntimeClient,
    InvokeAgentCommand
} from "@aws-sdk/client-bedrock-agent-runtime";
import { Config } from "./models";

export class AgentClient {
    #bedrockClient: BedrockAgentRuntimeClient;
    config: Config;
    sessionId: string;

    constructor(config: Config, credentials: any) {
        this.config = config;

        this.#bedrockClient = new BedrockAgentRuntimeClient({
            region: config.bedrock.region,
            credentials: credentials
        });
        this.sessionId = Date.now() + "";
    }

    async sendMessage(messages: any[]) {
        const command = new InvokeAgentCommand({
            agentId: this.config.bedrock.agent?.agentId,
            agentAliasId: this.config.bedrock.agent?.agentAliasId,
            sessionId: this.sessionId,
            inputText: messages[messages.length - 1].content[0].text
        });

        try {
            const response = await this.#bedrockClient.send(command);
            let completion = "";

            if (response.completion === undefined) {
                throw new Error("Completion is undefined");
            }

            for await (let chunkEvent of response.completion) {
                const chunk = chunkEvent.chunk;
                if (chunk) {
                    const decodedResponse = new TextDecoder("utf-8").decode(chunk.bytes);
                    completion += decodedResponse;
                }
            }
            return completion
        } catch (error) {
            console.log(`ERROR: ${error}`);
            throw error;
        }
    }
}