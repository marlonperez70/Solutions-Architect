from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Inventory Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class Product(BaseModel):
    id: int
    sku: str
    name: str
    quantity: int
    unit_price: float

products_db: dict = {}
product_counter = 1

@app.get("/api/v1/products")
async def list_products(skip: int = 0, limit: int = 100):
    return list(products_db.values())[skip:skip + limit]

@app.post("/api/v1/movements")
async def register_movement(product_id: int, quantity: int, movement_type: str):
    if product_id in products_db:
        if movement_type == "in":
            products_db[product_id]["quantity"] += quantity
        elif movement_type == "out":
            products_db[product_id]["quantity"] -= quantity
        logger.info(f"Movimiento registrado: {product_id} - {movement_type} - {quantity}")
    return {"status": "ok"}

@app.get("/api/v1/stock-levels")
async def get_stock_levels():
    return [{"product_id": p["id"], "quantity": p["quantity"]} for p in products_db.values()]

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Inventory"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
