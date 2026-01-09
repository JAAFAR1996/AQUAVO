
import "dotenv/config";
import { sendMessage } from "../services/gemini-ai.js";

async function main() {
    console.log("Starting chat debug...");

    try {
        const message = "فضل سمكة للمبتدئين؟";
        console.log(`Sending message: ${message}`);

        const response = await sendMessage(message, []);
        console.log("Response received:");
        console.log(response);

    } catch (error) {
        console.error("Chat failed with error:");
        console.error(error);
    }
}

main().catch(console.error);
