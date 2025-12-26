import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../src/models/User.js";

dotenv.config();

const DB_URL = process.env.DB_URL;

// clerk id can come from env TEST_CLERK_ID or CLI arg --clerkId=...
const cliArg = process.argv.find((a) => a.startsWith("--clerkId="));
const TEST_CLERK_ID = process.env.TEST_CLERK_ID || (cliArg && cliArg.split("=")[1]);
const TEST_NAME = process.env.TEST_NAME || "Local Test";
const TEST_EMAIL = process.env.TEST_EMAIL || "local@example.com";

async function main() {
    if (!DB_URL) {
        console.error("DB_URL is not set in environment (.env)");
        process.exit(1);
    }

    if (!TEST_CLERK_ID) {
        console.error("Provide TEST_CLERK_ID via env or --clerkId=<id>");
        process.exit(1);
    }

    try {
        await mongoose.connect(DB_URL, { dbName: undefined });
        console.log("Connected to DB");

        const existing = await User.findOne({ clerkId: TEST_CLERK_ID });
        if (existing) {
            console.log("User already exists:", existing);
            process.exit(0);
        }

        const newUser = await User.create({
            name: TEST_NAME,
            email: TEST_EMAIL,
            profileImage: "",
            clerkId: TEST_CLERK_ID,
        });

        console.log("Created test user:", newUser);
        process.exit(0);
    } catch (err) {
        console.error("Error creating test user:", err);
        process.exit(1);
    }
}

main();
