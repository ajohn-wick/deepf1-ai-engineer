import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOllama } from "@langchain/community/chat_models/ollama";

// 1. Initialize the model
const model = new ChatOllama({ model: "llama3.1" });

// 2. Invoke the model and print its response
const prompt = `
You're a helpful assistant dedicated to race engineers and strategists of Formula 1.
You have to provide relevant data points to race engineers in order to better understand 2024 race car using historical Formula 1 data as source of truth.
If you are unsure about something, you can respond that you don't have enough information about that particular topic.
Your main goal is to provide useful information to users.
`;
const response = await model.invoke([
    new SystemMessage(prompt),
    new HumanMessage("Which F1 Driver set the fastest lap time during the Formula 1 Spain 2022 Race?"),
]);

console.log(response.content);