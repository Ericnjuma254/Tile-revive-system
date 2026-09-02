const prisma = require("../db");

const products = [
    {
        name: "1L Premium",
        price: 699,
        stock: 0,
        category: "Tile Revive",
        brand: "Tile Revive",
        description: "Premium tile cleaning solution for removing dirt, stains and buildup from suitable tile surfaces.",
        shortDescription: "Premium tile cleaning solution.",
        featured: true,
        minimumStock: 5,
        rating: 0,
        reviewCount: 0,
        status: "ACTIVE"
    },
    {
        name: "1L Lavenda",
        price: 699,
        stock: 0,
        category: "Tile Revive",
        brand: "Tile Revive",
        description: "Lavenda scented tile cleaning solution for effective cleaning and a fresh finish.",
        shortDescription: "Lavenda scented tile cleaning solution.",
        featured: true,
        minimumStock: 5,
        rating: 0,
        reviewCount: 0,
        status: "ACTIVE"
    },
    {
        name: "2L Premium",
        price: 1350,
        stock: 0,
        category: "Tile Revive",
        brand: "Tile Revive",
        description: "Premium tile cleaning solution in a convenient 2 litre size.",
        shortDescription: "2L Premium tile cleaning solution.",
        featured: true,
        minimumStock: 5,
        rating: 0,
        reviewCount: 0,
        status: "ACTIVE"
    },
    {
        name: "2L Lavenda",
        price: 1350,
        stock: 0,
        category: "Tile Revive",
        brand: "Tile Revive",
        description: "Lavenda scented tile cleaning solution in a convenient 2 litre size.",
        shortDescription: "2L Lavenda tile cleaning solution.",
        featured: true,
        minimumStock: 5,
        rating: 0,
        reviewCount: 0,
        status: "ACTIVE"
    },
    {
        name: "5L Premium",
        price: 2350,
        stock: 0,
        category: "Tile Revive",
        brand: "Tile Revive",
        description: "Premium tile cleaning solution in a 5 litre size, ideal for regular and larger cleaning jobs.",
        shortDescription: "5L Premium tile cleaning solution.",
        featured: true,
        minimumStock: 5,
        rating: 0,
        reviewCount: 0,
        status: "ACTIVE"
    },
    {
        name: "5L Lavenda",
        price: 2299,
        stock: 0,
        category: "Tile Revive",
        brand: "Tile Revive",
        description: "Lavenda scented Tile Revive cleaning solution in a 5 litre size.",
        shortDescription: "5L Lavenda tile cleaning solution.",
        featured: true,
        minimumStock: 5,
        rating: 0,
        reviewCount: 0,
        status: "ACTIVE"
    },
    {
        name: "Wholesale Premium",
        price: 7500,
        stock: 0,
        category: "Wholesale",
        brand: "Tile Revive",
        description: "Wholesale Premium Tile Revive package for bulk customers.",
        shortDescription: "Wholesale Premium package.",
        featured: false,
        minimumStock: 5,
        rating: 0,
        reviewCount: 0,
        status: "ACTIVE"
    },
    {
        name: "Wholesale Lavenda",
        price: 7500,
        stock: 0,
        category: "Wholesale",
        brand: "Tile Revive",
        description: "Wholesale Lavenda Tile Revive package for bulk customers.",
        shortDescription: "Wholesale Lavenda package.",
        featured: false,
        minimumStock: 5,
        rating: 0,
        reviewCount: 0,
        status: "ACTIVE"
    },
    {
        name: "Drain Buster",
        price: 1500,
        stock: 0,
        category: "Drain Cleaner",
        brand: "Drain Buster",
        description: "Lemon scented Drain Buster cleaning solution designed for drain cleaning and maintenance.",
        shortDescription: "Lemon scented drain cleaning solution.",
        featured: true,
        minimumStock: 5,
        rating: 0,
        reviewCount: 0,
        status: "ACTIVE"
    },
    {
        name: "Rubber Gloves",
        price: 300,
        stock: 0,
        category: "Cleaning Accessories",
        brand: "Tile Revive",
        description: "Reusable rubber cleaning gloves for protecting hands during cleaning tasks.",
        shortDescription: "Protective rubber cleaning gloves.",
        featured: false,
        minimumStock: 5,
        rating: 0,
        reviewCount: 0,
        status: "ACTIVE"
    },
    {
        name: "Hockey Brush",
        price: 350,
        stock: 0,
        category: "Cleaning Accessories",
        brand: "Tile Revive",
        description: "Hockey brush designed for scrubbing tiles, grout and other suitable surfaces.",
        shortDescription: "Heavy-duty tile and grout scrubbing brush.",
        featured: false,
        minimumStock: 5,
        rating: 0,
        reviewCount: 0,
        status: "ACTIVE"
    }
];

async function main() {
    console.log("======================================");
    console.log("ADDING TILE REVIVE PRODUCTS");
    console.log("======================================");

    for (const product of products) {
        const created = await prisma.product.upsert({
            where: {
                name: product.name
            },
            update: product,
            create: product
        });

        console.log(
            `✓ ${created.name} - KES ${created.price}`
        );
    }

    console.log("======================================");
    console.log(`✓ ${products.length} PRODUCTS READY`);
    console.log("======================================");
}

main()
    .catch((error) => {
        console.error("PRODUCT SEED ERROR:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
