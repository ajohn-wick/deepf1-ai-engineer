import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatBedrockConverse } from "@langchain/aws";
import { AmazonKnowledgeBaseRetriever } from "@langchain/aws";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";

import { config } from "./config.js";

const modelId = config['modelId'];
const knowledgeBaseId = config['knowledgeBaseId'];

if (modelId !== "" && knowledgeBaseId !== "") {
    // 1. Initialize the models
    const model = new ChatBedrockConverse({
        model: modelId,
        topP: 0.9,
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            sessionToken: process.env.AWS_SESSION_TOKEN,
        },
    });

    // 2. Initialize the Bedrock Knowledge Base retriever
    const retriever = new AmazonKnowledgeBaseRetriever({
        knowledgeBaseId: knowledgeBaseId,
        region: process.env.AWS_REGION,
    });

    // 3. Create the RAG chain that retrieves and combines the prompt with the documents
    const prompt = `
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
    const combineDocsChain = await createStuffDocumentsChain({
        llm: model,
        prompt: ChatPromptTemplate.fromMessages([
            ["system", prompt],
            ["human", "Answer the question: {input}\nOnly consider the following documents as source of truth:\n\n{context}"],
        ]),
    });
    const chain = await createRetrievalChain({
        retriever: retriever,
        combineDocsChain,
    });

    // 4. Invoke the model and print its response
    const response = await chain.invoke({ input: "Which F1 Driver set the fastest lap time during the Formula 1 Monaco 2024 Race?" });
    console.log(`answer: ${response.answer}`);
}
else {
    console.log("Please set the knowledgeBaseId and modelId in the config.js file");
}