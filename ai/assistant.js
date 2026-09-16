require("dotenv").config();

const OpenAI = require("openai");

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
    const question = process.argv.slice(2).join(" ");

    if (!question) {
        console.log('Usage: node ai/assistant.js "Your question"');
        return;
    }

    if (!process.env.OPENAI_API_KEY) {
        console.error("OPENAI_API_KEY is missing from .env");
        process.exit(1);
    }

    console.log("Tile Revive AI Assistant");
    console.log("Request:", question);
    console.log("Connecting to OpenAI...");

    const response = await client.responses.create({
        model: "gpt-5.6",
        input: [
            {
                role: "system",
                content:
                    "You are a senior software engineer helping debug the Tile Revive system. Give precise, factual technical guidance. Do not invent files or errors.",
            },
            {
                role: "user",
                content: question,
            },
        ],
    });

    console.log("\n============================================");
    console.log(" TILE REVIVE AI RESPONSE");
    console.log("============================================\n");

    console.log(response.output_text);
}

main().catch((error) => {
    console.error("\nAI assistant error:");
    console.error(error);
    process.exit(1);
});
