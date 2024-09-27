import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";

// 1. Initialize the models
const model = new ChatOllama({ model: "llama3.2", temperature: 0, topP: 0.9 });
const embeddings = new OllamaEmbeddings({ model: "nomic-embed-text" });

// 2. Load F1 Data and split it into smaller chunks
const loader = new DirectoryLoader("./../data",
    {
        ".csv": (path) => new CSVLoader(path),
    }
);
const csvData = await loader.load();
const splitter = new RecursiveCharacterTextSplitter({
    separators: "\n",
    chunkSize: 512,
    chunkOverlap: 200
});
const deepF1Docs = await splitter.splitDocuments(csvData);

// 3. Put the documents into a vector store and convert them to vectors
const vectorStore = await FaissStore.fromDocuments(deepF1Docs, embeddings, {});

// 4. Create the RAG chain that retrieves and combines the prompt with the documents
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
        ["human", "Answer the question: {input}\nOnly consisder the following documents as source of truth:\n\n{context}"],
    ]),
});
const chain = await createRetrievalChain({
    retriever: vectorStore.asRetriever(),
    combineDocsChain,
});

// 5. Invoke the model and print its response
const response = await chain.invoke({ input: "Which F1 Driver set the fastest lap time during the Formula 1 Monaco 2023 Race?" });
console.log(response['answer']);