import {
  OllamaEmbedding,
  Settings,
  SimpleDirectoryReader,
  Document,
  VectorStoreIndex,
  SentenceSplitter
} from "llamaindex";
import { Bedrock } from "@llamaindex/community";

import { config } from "./config.js";

// const knowledgeBaseId = config['knowledgeBaseId'];
const modelId = config['modelId'];

// 1. Initialize the models
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
Settings.embedModel = new OllamaEmbedding({ model: "nomic-embed-text" });

// 2. Load F1 Data and split it into smaller chunks
const loader = new SimpleDirectoryReader();
const csvData = await loader.loadData("./../data");
let deepF1Docs = [];
csvData.forEach((doc) => {
  // console.log(`document (${doc.id_}):`, doc.getText());
  deepF1Docs.push(new Document({
      id_: doc.id_,
      text: doc.getText()
  }));
});
const splitter = new SentenceSplitter({
  separator: "\n",
  chunkSize: 512,
  chunkOverlap: 200
})
const deepF1Nodes = splitter.getNodesFromDocuments(deepF1Docs);

// 3. Put the documents into a vector store
const vectorStore = await VectorStoreIndex.fromDocuments(deepF1Nodes);

// 4. Combine the prompt with the documents
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

// 5. Invoke the model and print its response
const queryEngine = vectorStore.asQueryEngine({
  similarityTopK: 10
});
const response = await queryEngine.query({
  query: "Which F1 Driver set the fastest lap time during the Formula 1 Monaco 2023 Race?",
});
console.log(response.message.content);