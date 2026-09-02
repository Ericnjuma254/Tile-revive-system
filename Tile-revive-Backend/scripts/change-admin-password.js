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
        console.log(" CHANGE ADMIN PASSWORD");
        console.log("======================================\n");

        const emailInput = await ask("Admin email: ");
        const newPassword = await ask("New admin password: ");
        const confirmPassword = await ask("Confirm new password: ");

        const email = emailInput.trim().toLowerCase();

        if (!email || !newPassword || !confirmPassword) {
            throw new Error(
                "Email, password and password confirmation are required."
            );
        }

        if (newPassword.length < 8) {
            throw new Error(
                "Password must be at least 8 characters."
            );
        }

        if (newPassword !== confirmPassword) {
            throw new Error(
                "Passwords do not match."
            );
        }

        const admin = await prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (!admin) {
            throw new Error(
                "No user found with that email."
            );
        }

        if (admin.role !== "ADMIN") {
            throw new Error(
                "This account is not an ADMIN account."
            );
        }

        const hashedPassword = await bcrypt.hash(
            newPassword,
            12
        );

        await prisma.user.update({
            where: {
                id: admin.id,
            },
            data: {
                password: hashedPassword,
            },
        });

        console.log("\n======================================");
        console.log(" ADMIN PASSWORD CHANGED SUCCESSFULLY");
        console.log("======================================");
        console.log(`ID:    ${admin.id}`);
        console.log(`Name:  ${admin.fullName}`);
        console.log(`Email: ${admin.email}`);
        console.log("Role:  ADMIN");
        console.log("======================================\n");

    } catch (error) {
        console.error("\nPASSWORD CHANGE ERROR:");
        console.error(error.message);
    } finally {
        await prisma.$disconnect();
        rl.close();
    }
}

main();