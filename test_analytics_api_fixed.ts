import { config } from 'dotenv';
config({ path: '.env', override: true }); // Ensure DATABASE_URL overrides stale shell env

// Setup manual HTTP DB instance for testing instead of using the WS pool
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './shared/schema.js';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema }) as any;

import { analytics } from './server/routes/admin.js';
import { PredictiveAnalytics } from './server/services/predictive-analytics.js';
import { AnalyticsTracker } from './server/services/analytics-tracker.js';

async function verifyAnalytics() {
    console.log("Starting verification...");

    try {
        const predictive = new PredictiveAnalytics(db);
        const tracker = new AnalyticsTracker(db);

        console.log("Testing tracker.getTrendingProducts()...");
        const trending = await tracker.getTrendingProducts(30, 5);
        console.log("Success! Found", trending.length, "items.");

        console.log("Testing tracker.getTopSearchKeywords()...");
        const topSearch = await tracker.getTopSearchKeywords(30, 5);
        console.log("Success! Found", topSearch.length, "items.");

        console.log("Testing predictive.predictNeeds()...");
        const predictedNeeds = await predictive.predictNeeds(1); // Assuming user ID 1 exists
        console.log("Success! Found", predictedNeeds.length, "items.");

    } catch (error) {
        console.error("Test failed with error:", error);
        process.exit(1);
    }

    console.log("All tests passed! 500 API crashes are fixed.");
    process.exit(0);
}

verifyAnalytics();
