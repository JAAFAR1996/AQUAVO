import "./server/env.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
async function test() {
  const modelsToTest = [
    "embedding-001",
    "text-embedding-004",
    "text-embedding-005",
    "gemini-embedding-001",
    "gemini-embedding-exp",
    "gemini-2.5-embedding",
    "text-embedding-001"
  ];
  
  for (const modelName of modelsToTest) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const res = await model.embedContent("Hello world");
      console.log(`✅ ${modelName} worked! Dimensions:`, res.embedding.values.length);
    } catch (e: any) {
      console.error(`❌ ${modelName} failed:`, e.message.split('\n')[0]);
    }
  }
}
test();
