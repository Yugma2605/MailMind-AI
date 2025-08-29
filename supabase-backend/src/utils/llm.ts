import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Initialize Gemini LLM
// console.log(process.env);
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash",
  apiKey: process.env.GEMINI_API_KEY,
});

export default llm;