import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
    console.error('No API key found in .env');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function checkModels() {
    try {
        const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
        const res = await model.embedContent('test');
        console.log('SUCCESS text-embedding-004:', res.embedding.values.length);
    } catch (e) {
        console.error('ERROR text-embedding-004:', e.message);
    }
}

checkModels();
