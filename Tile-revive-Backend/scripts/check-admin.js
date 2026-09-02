const prisma = require("../db");

async function main() {
    const admin = await prisma.user.findUnique({
        where: {
            email: "tilerevive7@gmail.com",
        },
        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            emailVerified: true,
            adminApproved: true,
        },
    });

    console.log("\nADMIN DATABASE CHECK:");
    console.log(admin);
}

main()
    .catch((error) => {
        console.error("ERROR:", error);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });