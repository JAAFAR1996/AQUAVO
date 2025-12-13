
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Load env from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../shared/schema.ts";
import { users, cartItems, favorites, userAddresses, auditLogs, orders, reviews, gallerySubmissions } from "../shared/schema.ts";
import crypto from "crypto";

console.log("Script started");
if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is missing!");
    process.exit(1);
}
console.log("DATABASE_URL found (length: " + process.env.DATABASE_URL.length + ")");

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });



function hashPassword(password: string) {
    const salt = crypto.randomBytes(16).toString("hex");
    const digest = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${digest}`;
}

async function reset() {
    console.log("Starting user reset...");

    try {
        console.log("Deleting cart items...");
        await db.delete(cartItems);

        console.log("Deleting favorites...");
        await db.delete(favorites);

        console.log("Deleting user addresses...");
        await db.delete(userAddresses);

        console.log("Deleting audit logs...");
        await db.delete(auditLogs);

        console.log("Unlinking orders...");
        await db.update(orders).set({ userId: null });

        console.log("Unlinking reviews...");
        await db.update(reviews).set({ userId: null });

        console.log("Unlinking gallery submissions...");
        await db.update(gallerySubmissions).set({ userId: null });

        console.log("Deleting all users...");
        await db.delete(users);

        console.log("Creating new admin user...");
        const adminEmail = "admin@fishweb.com";
        const adminPass = "admin123";
        const passwordHash = hashPassword(adminPass);

        await db.insert(users).values({
            email: adminEmail,
            passwordHash: passwordHash,
            role: "admin",
            fullName: "System Admin",
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        console.log("User reset complete.");
        console.log(`New Admin Credentials:`);
        console.log(`Email: ${adminEmail}`);
        console.log(`Password: ${adminPass}`);
        process.exit(0);

    } catch (e) {
        console.error("Error during reset:", e);
        process.exit(1);
    }
}

reset();
