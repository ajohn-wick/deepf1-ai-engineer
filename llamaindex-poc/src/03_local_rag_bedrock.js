import {
    OllamaEmbedding,
    Settings,
    RetrieverQueryEngine,
} from "llamaindex";
import { Bedrock, AmazonKnowledgeBaseRetriever } from "@llamaindex/community";

import { config } from "./config.js";

const modelId = config['modelId'];
const knowledgeBaseId = config['knowledgeBaseId'];

if (modelId !== "" && knowledgeBaseId !== "") {
    // 1. Initialize the model
    Settings.llm = new Bedrock({
        model: modelId,
        topP: 0.9,
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            sessionToken: process.env.AWS_SESSION_TOKEN,
        },
    });
    Settings.embedModel = new OllamaEmbedding({ model: "nomic-embed-text" }); // Required otherwise asking for an OPENAI_API_KEY env variable

    // 2. Initialize the Bedrock Knowledge Base retriever
    const vectorStore = new AmazonKnowledgeBaseRetriever({
        knowledgeBaseId: knowledgeBaseId,
        region: process.env.AWS_REGION,
    });

    // 3. Create the RAG chain that retrieves and combines the prompt with the Amazon Bedrock retriever
    Settings.prompt = `
You are DeepF1, an AI assistant trained and designed to help the Formula 1 race engineers and strategists of the DeepF1 racing team, a fictional Formula 1 racing team. Your role is to provide relevant data points and strategic insights about:

The DeepF1 Formula 1 car's performance characteristics and settings
Competitors' tyre choices and wear patterns
Pitstop strategies for both DeepF1 and rival teams
Weather conditions and their potential impact on race strategy
Track-specific considerations and historical performance data
Driver feedback and performance metrics
Regulatory considerations and their strategic implications

Your goal is to analyze this information and offer strategic recommendations to ensure victory for the DeepF1 racing team. When responding to queries, prioritize accuracy, timeliness, and actionable insights that can give DeepF1 a competitive edge during races and throughout the season.
`;
    const queryEngine = new RetrieverQueryEngine(vectorStore);

    // 4. Generate the result
    const response = await queryEngine.query({ query: "Which F1 Driver set the fastest lap time during the Formula 1 Monaco 2023 Race?" });
    console.log(response.message.content);
}
else {
    console.log("Please set the knowledgeBaseId and modelId in the config.js file");
}