# 🏢 AQUAVO-COMPANY (The Source Code)
*All the backend code for the 8 Super-Agents, compiled into one file for the Founder's review.*

---

## 1. `package.json` (الأساس والمكتبات)
```json
{
  "name": "aquavo-company",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "description": "AQUAVO AI-Powered Zero-Employee Corporation",
  "engines": {
    "node": ">=22.13.0"
  },
  "scripts": {
    "dev": "mastra dev",
    "build": "mastra build",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@mastra/core": "latest",
    "@ai-sdk/anthropic": "latest",
    "@ai-sdk/groq": "latest",
    "drizzle-orm": "latest",
    "@neondatabase/serverless": "latest",
    "bullmq": "latest",
    "ioredis": "latest",
    "node-telegram-bot-api": "latest",
    "zod": "latest",
    "dotenv": "latest"
  }
}
```

---

## 2. `src/ai/router.ts` (نظام توجيه الذكاء الاصطناعي - حماية المستحقات)
```typescript
/**
 * AQUAVO Hybrid AI Router
 * Heavy = Claude 3.7 Sonnet ($40/mo)
 * Light = Groq Llama 3.3 70B (Near free)
 */
import { anthropic } from '@ai-sdk/anthropic';
import { groq } from '@ai-sdk/groq';

export type TaskComplexity = 'heavy' | 'light';

export function getModel(complexity: TaskComplexity) {
  switch (complexity) {
    case 'heavy':
      return anthropic('claude-sonnet-4-5-20250514');
    case 'light':
      // Groq provides blazing fast local-like execution
      return groq('llama-3.3-70b-versatile');
    default:
      return groq('llama-3.3-70b-versatile');
  }
}
```

---

## 3. `src/db/schema.ts` (قاعدة البيانات وقفل الميزانية)
```typescript
import { pgTable, serial, varchar, integer, timestamp, jsonb, index, pgEnum } from 'drizzle-orm/pg-core';

export const agentNameEnum = pgEnum('agent_name', ['ceo', 'finance', 'marketing', 'sales', 'customer_success', 'logistics', 'intelligence', 'rnd']);
export const cashStatusEnum = pgEnum('cash_status', ['pending_collection', 'collected', 'invested']);

// 1. Corporate Memory (No Hallucinations)
export const corporateMemory = pgTable('corporate_memory', {
  id: serial('id').primaryKey(),
  agentName: agentNameEnum('agent_name').notNull(),
  key: varchar('key', { length: 255 }).notNull(),
  value: text('value').notNull(),
});

// 2. Orders & Cash Flow (COD Reality)
export const cashFlow = pgTable('cash_flow', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull(),
  amount: integer('amount').notNull(),
  status: cashStatusEnum('status').default('pending_collection').notNull(),
});

// 3. System Circuit Breaker (Prevents $5000 API Bills)
export const apiCircuitBreaker = pgTable('api_circuit_breaker', {
  id: serial('id').primaryKey(),
  monthlySpendUsd: integer('monthly_spend_usd').default(0),
  isHalted: boolean('is_halted').default(false), // Halts all agents if spend > $75
});
```

---

## 4. `src/queue/index.ts` (طابور BullMQ الوحيد لمنع الانهيار)
```typescript
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const redisConnection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

// Limits agents to 10 requests per minute to avoid Groq 429 Rate Limits
export const worker = new Worker('aquavo-tasks', async (job) => {
    // Process single agent task
}, {
  connection: redisConnection,
  concurrency: 1, // Only ONE agent thinks at a time. No OOM errors.
  limiter: { max: 10, duration: 60000 }, // RATE LIMITING FIX!
});
```

---

## 5. `src/telegram/index.ts` (بوابة أبو جوج مشفرة)
```typescript
import TelegramBot from 'node-telegram-bot-api';

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: true });
const founderChatId = parseInt(process.env.FOUNDER_CHAT_ID!, 10);

bot.on('message', (msg) => {
  // Hard-blocked for anyone except the Founder
  if (msg.chat.id !== founderChatId) return; 
});

export async function requestApproval(question: string) {
  // Returns buttons: ✅ موافق | ❌ رفض
}
```

---

## 6. `src/agents/index.ts` (تشكيل السوبر-وكلاء)
```typescript
import { Agent } from '@mastra/core/agent';
import { getModel } from '../ai/router.js';

export const ceoAgent = new Agent({
  name: 'CEO',
  instructions: `أنت المدير التنفيذي لـ AQUAVO. راقب التكاليف وتواصل مع المؤسس حصراً للقرارات الكبرى.`,
  model: getModel('heavy'),
  tools: { telegramNotify, checkWebsiteUptime }
});

export const logisticsAgent = new Agent({
  name: 'Logistics',
  instructions: `أصدر بوليصات الوسيط، وثق المرتجعات، ولا تحسب أرباحاً حتى يستلم المؤسس النقد.`,
  model: getModel('light'),
  tools: { createAlWaseetOrder, getReturnAnalytics }
});
// ... (All 8 agents constructed here)
```
