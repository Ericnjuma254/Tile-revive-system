const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {

    const products = [

        {
            name: "1L Tile Revive Premium",
            price: 699,
            stock: 100,
            category: "Tile Revive"
        },

        {
            name: "1L Tile Revive Lavenda",
            price: 699,
            stock: 100,
            category: "Tile Revive"
        },

        {
            name: "2L Tile Revive Premium",
            price: 1350,
            stock: 100,
            category: "Tile Revive"
        },

        {
            name: "2L Tile Revive Lavenda",
            price: 1350,
            stock: 100,
            category: "Tile Revive"
        },

        {
            name: "5L Tile Revive Premium",
            price: 2300,
            stock: 100,
            category: "Tile Revive"
        },

        {
            name: "5L Tile Revive Lavenda",
            price: 2300,
            stock: 100,
            category: "Tile Revive"
        },

        {
            name: "5 × 5L Wholesale Premium",
            price: 7500,
            stock: 50,
            category: "Wholesale"
        },

        {
            name: "5 × 5L Wholesale Lavenda",
            price: 7500,
            stock: 50,
            category: "Wholesale"
        },

        {
            name: "600g Drain Buster",
            price: 1500,
            stock: 50,
            category: "Drain Buster"
        },

        {
            name: "Rubber Gloves",
            price: 300,
            stock: 200,
            category: "Accessories"
        },

        {
            name: "Hockey Brush",
            price: 350,
            stock: 150,
            category: "Accessories"
        }

    ];

    for (const product of products) {

        await prisma.product.upsert({

            where: {
                name: product.name
            },

            update: {
                price: product.price,
                stock: product.stock,
                category: product.category
            },

            create: product

        });

    }

    console.log("✅ Tile Revive catalog seeded successfully.");

}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });