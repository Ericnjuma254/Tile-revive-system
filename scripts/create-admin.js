const readline = require("readline");
const bcrypt = require("bcryptjs");
const prisma = require("../db");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

async function main() {
    try {
        console.log("\n======================================");
        console.log(" CREATE FIRST ADMIN");
        console.log("======================================\n");

        const fullName = await ask("Admin full name: ");
        const emailInput = await ask("Admin email: ");
        const password = await ask("Admin password: ");

        const email = emailInput.trim().toLowerCase();

        if (!fullName || !email || !password) {
            throw new Error(
                "Full name, email and password are required."
            );
        }

        if (password.length < 8) {
            throw new Error(
                "Password must be at least 8 characters."
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const existingUser = await prisma.user.findUnique({
            where: {
                email,
            },
        });

        let admin;

        if (existingUser) {
            console.log(
                "\nExisting user found. Promoting this account to ADMIN..."
            );

            admin = await prisma.user.update({
                where: {
                    id: existingUser.id,
                },
                data: {
                    fullName,
                    password: hashedPassword,
                    role: "ADMIN",

                    emailVerified: true,
                    emailVerifiedAt: new Date(),

                    adminApproved: true,
                    approvedAt: new Date(),

                    loginOtpHash: null,
                    loginOtpExpiresAt: null,
                    loginOtpAttempts: 0,
                },
            });
        } else {
            admin = await prisma.user.create({
                data: {
                    fullName,
                    email,
                    password: hashedPassword,

                    role: "ADMIN",

                    emailVerified: true,
                    emailVerifiedAt: new Date(),

                    adminApproved: true,
                    approvedAt: new Date(),

                    loginOtpAttempts: 0,
                },
            });
        }

        console.log("\n======================================");
        console.log(" ADMIN CREATED SUCCESSFULLY");
        console.log("======================================");
        console.log(`ID:    ${admin.id}`);
        console.log(`Name:  ${admin.fullName}`);
        console.log(`Email: ${admin.email}`);
        console.log(`Role:  ${admin.role}`);
        console.log("Email verified: YES");
        console.log("Admin approved: YES");
        console.log("======================================\n");

    } catch (error) {
        console.error("\nADMIN CREATION ERROR:");
        console.error(error.message);
    } finally {
        await prisma.$disconnect();
        rl.close();
    }
}

main();