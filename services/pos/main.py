"""
POS Microservice - Point of Sale
Procesamiento de transacciones de venta en punto de venta
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="POS Service",
    description="Point of Sale Microservice",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MODELOS
class PaymentMethod(str, Enum):
    CASH = "cash"
    CARD = "card"
    MOBILE = "mobile"
    CHECK = "check"

class TransactionStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"

class Transaction(BaseModel):
    id: int
    terminal_id: int
    items: List[dict]
    total_amount: float
    payment_method: PaymentMethod
    status: TransactionStatus
    timestamp: datetime
    cashier_id: int

class CreateTransactionRequest(BaseModel):
    terminal_id: int
    items: List[dict]
    payment_method: PaymentMethod
    cashier_id: int

# STORAGE
transactions_db: dict = {}
transaction_counter = 1

# ENDPOINTS
@app.post("/api/v1/transactions")
async def create_transaction(request: CreateTransactionRequest):
    """Crear nueva transacción de venta"""
    global transaction_counter
    
    total = sum(item.get("quantity", 0) * item.get("price", 0) for item in request.items)
    
    transaction = {
        "id": transaction_counter,
        "terminal_id": request.terminal_id,
        "items": request.items,
        "total_amount": total,
        "payment_method": request.payment_method,
        "status": TransactionStatus.COMPLETED,
        "timestamp": datetime.now(),
        "cashier_id": request.cashier_id
    }
    
    transactions_db[transaction_counter] = transaction
    transaction_counter += 1
    
    logger.info(f"Transacción creada: {transaction_counter} - ${total}")
    return transaction

@app.get("/api/v1/transactions")
async def list_transactions(skip: int = 0, limit: int = 100):
    """Listar transacciones"""
    return list(transactions_db.values())[skip:skip + limit]

@app.get("/api/v1/transactions/{transaction_id}")
async def get_transaction(transaction_id: int):
    """Obtener transacción específica"""
    if transaction_id not in transactions_db:
        raise HTTPException(status_code=404, detail="Transacción no encontrada")
    return transactions_db[transaction_id]

@app.post("/api/v1/reconciliation")
async def reconcile_cash(terminal_id: int):
    """Reconciliar caja de terminal"""
    terminal_transactions = [t for t in transactions_db.values() if t["terminal_id"] == terminal_id]
    total = sum(t["total_amount"] for t in terminal_transactions)
    
    return {
        "terminal_id": terminal_id,
        "transaction_count": len(terminal_transactions),
        "total_amount": total,
        "timestamp": datetime.now()
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "POS"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
