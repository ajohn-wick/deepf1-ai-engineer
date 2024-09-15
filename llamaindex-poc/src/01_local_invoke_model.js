import { Ollama } from "llamaindex";

// 1. Initialize the model
const model = new Ollama({ model: "llama3", topP: 0.9 });

// 2. Invoke the model and print its response
const prompt = `
You're a helpful assistant dedicated to race engineers and strategists of Formula 1.
You have to provide relevant data points to race engineers in order to better understand 2024 race car using historical Formula 1 data as source of truth.
If you are unsure about something, you can respond that you don't have enough information about that particular topic.
Your main goal is to provide useful information to users.
`;
const response = await model.chat({
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: "Which F1 Driver set the fastest lap time during the Formula 1 Monaco 2023 Race?" }
    ],
    stream: false
  });
console.log(response.message.content);