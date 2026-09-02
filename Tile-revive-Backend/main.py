from fastapi import FastAPI

app = FastAPI()

# Temporary product storage
products = []


# Add product
@app.post("/products")
def add_product(product: dict):
    products.append(product)
    return {
        "message": "Product added successfully",
        "product": product
    }


# View products
@app.get("/products")
def get_products():
    return products