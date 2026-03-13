from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CRM Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class Customer(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime

customers_db: dict = {}
customer_counter = 1

@app.post("/api/v1/customers")
async def create_customer(name: str, email: str, phone: Optional[str] = None, address: Optional[str] = None):
    global customer_counter
    customer = {"id": customer_counter, "name": name, "email": email, "phone": phone, "address": address, "created_at": datetime.now()}
    customers_db[customer_counter] = customer
    customer_counter += 1
    logger.info(f"Cliente creado: {name}")
    return customer

@app.get("/api/v1/customers")
async def list_customers(skip: int = 0, limit: int = 100):
    return list(customers_db.values())[skip:skip + limit]

@app.get("/api/v1/customers/{customer_id}")
async def get_customer(customer_id: int):
    if customer_id not in customers_db:
        return {"error": "Cliente no encontrado"}
    return customers_db[customer_id]

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "CRM"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
