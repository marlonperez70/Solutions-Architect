from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Payments Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class Payment(BaseModel):
    id: int
    amount: float
    currency: str
    status: str
    created_at: datetime

payments_db: dict = {}
payment_counter = 1

@app.post("/api/v1/payments")
async def process_payment(amount: float, currency: str = "USD"):
    global payment_counter
    payment = {"id": payment_counter, "amount": amount, "currency": currency, "status": "completed", "created_at": datetime.now()}
    payments_db[payment_counter] = payment
    payment_counter += 1
    logger.info(f"Pago procesado: ${amount}")
    return payment

@app.get("/api/v1/payments/{payment_id}")
async def get_payment(payment_id: int):
    if payment_id not in payments_db:
        return {"error": "Pago no encontrado"}
    return payments_db[payment_id]

@app.post("/api/v1/refunds")
async def process_refund(payment_id: int):
    if payment_id in payments_db:
        payments_db[payment_id]["status"] = "refunded"
        logger.info(f"Reembolso procesado: {payment_id}")
    return {"status": "ok"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Payments"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
