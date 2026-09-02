require("dotenv").config();

const bcrypt = require("bcryptjs");
const prisma = require("./db");

async function createAdmin() {

    const email = "tilerevive7@gmail.com";
    const password = "Tilerevive@2026!";

    const existing = await prisma.user.findUnique({
        where: { email }
    });

    if (existing) {
        console.log("Admin already exists:", existing.email);
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await prisma.user.create({
        data: {
            fullName: "Eric Njuma",
            email,
            password: hashedPassword,
            role: "ADMIN",
            emailVerified: true,
            emailVerifiedAt: new Date(),
            adminApproved: true,
            approvedAt: new Date()
        }
    });

    console.log("======================================");
    console.log("ADMIN CREATED SUCCESSFULLY");
    console.log("======================================");
    console.log("ID:", admin.id);
    console.log("Email:", admin.email);
    console.log("Role:", admin.role);
    console.log("Email Verified:", admin.emailVerified);
    console.log("Admin Approved:", admin.adminApproved);
    console.log("Password: TileRevive@2026");
    console.log("======================================");
}

createAdmin()
    .catch(error => {
        console.error("CREATE ADMIN ERROR:", error);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

