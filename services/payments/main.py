"""
Payments Microservice - Procesamiento de Pagos
Gestiona transacciones, facturas, reconciliación y reportes financieros
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum
from decimal import Decimal
import logging
import uuid

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Payments Microservice",
    description="Procesamiento de pagos y transacciones",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============= MODELOS =============

class TransactionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REVERSED = "reversed"

class PaymentMethod(str, Enum):
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    BANK_TRANSFER = "bank_transfer"
    CASH = "cash"
    CHECK = "check"
    DIGITAL_WALLET = "digital_wallet"

class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class Transaction(BaseModel):
    id: str
    order_id: int
    customer_id: int
    amount: Decimal = Field(..., gt=0)
    currency: str = "USD"
    payment_method: PaymentMethod
    status: TransactionStatus
    reference_number: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_by: int

class CreateTransactionRequest(BaseModel):
    order_id: int
    customer_id: int
    amount: Decimal = Field(..., gt=0)
    currency: str = "USD"
    payment_method: PaymentMethod
    reference_number: str

class Invoice(BaseModel):
    id: str
    order_id: int
    customer_id: int
    invoice_number: str
    amount: Decimal = Field(..., gt=0)
    currency: str = "USD"
    status: InvoiceStatus
    issue_date: datetime
    due_date: datetime
    paid_date: Optional[datetime] = None
    paid_amount: Decimal = Decimal("0")
    created_by: int

class CreateInvoiceRequest(BaseModel):
    order_id: int
    customer_id: int
    amount: Decimal = Field(..., gt=0)
    currency: str = "USD"
    due_date: datetime

class Payment(BaseModel):
    id: str
    invoice_id: str
    transaction_id: str
    amount: Decimal = Field(..., gt=0)
    payment_date: datetime
    payment_method: PaymentMethod
    reference_number: str

class CreatePaymentRequest(BaseModel):
    invoice_id: str
    transaction_id: str
    amount: Decimal = Field(..., gt=0)
    payment_method: PaymentMethod
    reference_number: str

# ============= STORAGE =============

transactions_db: dict[str, Transaction] = {}
invoices_db: dict[str, Invoice] = {}
payments_db: dict[str, Payment] = {}

invoice_counter = 1000

# ============= TRANSACTION ENDPOINTS =============

@app.post("/transactions", tags=["Transactions"])
async def create_transaction(
    request: CreateTransactionRequest,
    user_id: int = 1
) -> Transaction:
    """Crear nueva transacción de pago"""
    transaction_id = str(uuid.uuid4())
    
    transaction = Transaction(
        id=transaction_id,
        order_id=request.order_id,
        customer_id=request.customer_id,
        amount=request.amount,
        currency=request.currency,
        payment_method=request.payment_method,
        status=TransactionStatus.PENDING,
        reference_number=request.reference_number,
        created_at=datetime.now(),
        created_by=user_id
    )
    
    transactions_db[transaction_id] = transaction
    
    logger.info(f"Transaction created: {transaction_id} - {request.amount} {request.currency}")
    return transaction

@app.get("/transactions/{transaction_id}", tags=["Transactions"])
async def get_transaction(transaction_id: str) -> Transaction:
    """Obtener detalles de transacción"""
    if transaction_id not in transactions_db:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transactions_db[transaction_id]

@app.get("/transactions", tags=["Transactions"])
async def list_transactions(
    status: Optional[TransactionStatus] = None,
    customer_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Transaction]:
    """Listar transacciones"""
    transactions = list(transactions_db.values())
    
    if status:
        transactions = [t for t in transactions if t.status == status]
    if customer_id:
        transactions = [t for t in transactions if t.customer_id == customer_id]
    
    return transactions[skip:skip + limit]

@app.put("/transactions/{transaction_id}/process", tags=["Transactions"])
async def process_transaction(
    transaction_id: str,
    success: bool = True,
    error_message: Optional[str] = None
) -> Transaction:
    """Procesar transacción (aprobar o rechazar)"""
    if transaction_id not in transactions_db:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    transaction = transactions_db[transaction_id]
    
    if success:
        transaction.status = TransactionStatus.COMPLETED
        transaction.completed_at = datetime.now()
        logger.info(f"Transaction completed: {transaction_id}")
    else:
        transaction.status = TransactionStatus.FAILED
        transaction.error_message = error_message
        logger.warning(f"Transaction failed: {transaction_id} - {error_message}")
    
    return transaction

# ============= INVOICE ENDPOINTS =============

@app.post("/invoices", tags=["Invoices"])
async def create_invoice(
    request: CreateInvoiceRequest,
    user_id: int = 1
) -> Invoice:
    """Crear nueva factura"""
    global invoice_counter
    
    invoice_id = str(uuid.uuid4())
    invoice_number = f"INV-{invoice_counter:06d}"
    invoice_counter += 1
    
    invoice = Invoice(
        id=invoice_id,
        order_id=request.order_id,
        customer_id=request.customer_id,
        invoice_number=invoice_number,
        amount=request.amount,
        currency=request.currency,
        status=InvoiceStatus.ISSUED,
        issue_date=datetime.now(),
        due_date=request.due_date,
        created_by=user_id
    )
    
    invoices_db[invoice_id] = invoice
    
    logger.info(f"Invoice created: {invoice_number}")
    return invoice

@app.get("/invoices/{invoice_id}", tags=["Invoices"])
async def get_invoice(invoice_id: str) -> Invoice:
    """Obtener detalles de factura"""
    if invoice_id not in invoices_db:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoices_db[invoice_id]

@app.get("/invoices", tags=["Invoices"])
async def list_invoices(
    status: Optional[InvoiceStatus] = None,
    customer_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Invoice]:
    """Listar facturas"""
    invoices = list(invoices_db.values())
    
    if status:
        invoices = [i for i in invoices if i.status == status]
    if customer_id:
        invoices = [i for i in invoices if i.customer_id == customer_id]
    
    return invoices[skip:skip + limit]

# ============= PAYMENT ENDPOINTS =============

@app.post("/payments", tags=["Payments"])
async def create_payment(request: CreatePaymentRequest) -> Payment:
    """Registrar pago de factura"""
    if request.invoice_id not in invoices_db:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    payment_id = str(uuid.uuid4())
    
    payment = Payment(
        id=payment_id,
        invoice_id=request.invoice_id,
        transaction_id=request.transaction_id,
        amount=request.amount,
        payment_date=datetime.now(),
        payment_method=request.payment_method,
        reference_number=request.reference_number
    )
    
    # Actualizar factura
    invoice = invoices_db[request.invoice_id]
    invoice.paid_amount += request.amount
    
    if invoice.paid_amount >= invoice.amount:
        invoice.status = InvoiceStatus.PAID
        invoice.paid_date = datetime.now()
    elif invoice.paid_amount > 0:
        invoice.status = InvoiceStatus.PARTIALLY_PAID
    
    payments_db[payment_id] = payment
    
    logger.info(f"Payment recorded: {payment_id} - {request.amount}")
    return payment

@app.get("/invoices/{invoice_id}/payments", tags=["Payments"])
async def get_invoice_payments(invoice_id: str) -> List[Payment]:
    """Obtener pagos de una factura"""
    return [p for p in payments_db.values() if p.invoice_id == invoice_id]

# ============= FINANCIAL REPORTS =============

@app.get("/reports/revenue", tags=["Reports"])
async def get_revenue_report(
    start_date: datetime,
    end_date: datetime
) -> dict:
    """Obtener reporte de ingresos"""
    completed_payments = [
        p for p in payments_db.values()
        if start_date <= p.payment_date <= end_date
    ]
    
    total_revenue = sum(p.amount for p in completed_payments)
    
    return {
        "period": f"{start_date.date()} to {end_date.date()}",
        "total_revenue": float(total_revenue),
        "total_payments": len(completed_payments),
        "average_payment": float(total_revenue / len(completed_payments)) if completed_payments else 0
    }

@app.get("/reports/outstanding", tags=["Reports"])
async def get_outstanding_invoices() -> dict:
    """Obtener reporte de facturas pendientes"""
    outstanding = [
        i for i in invoices_db.values()
        if i.status in [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE]
    ]
    
    total_outstanding = sum(i.amount - i.paid_amount for i in outstanding)
    
    return {
        "total_outstanding_invoices": len(outstanding),
        "total_outstanding_amount": float(total_outstanding),
        "invoices": [
            {
                "invoice_number": i.invoice_number,
                "amount": float(i.amount),
                "paid": float(i.paid_amount),
                "pending": float(i.amount - i.paid_amount),
                "status": i.status
            }
            for i in outstanding
        ]
    }

# ============= HEALTH CHECK =============

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Payments Microservice",
        "timestamp": datetime.now().isoformat()
    }

# ============= METRICS =============

@app.get("/metrics", tags=["Metrics"])
async def get_metrics():
    """Obtener métricas del servicio"""
    completed_transactions = sum(1 for t in transactions_db.values() if t.status == TransactionStatus.COMPLETED)
    total_revenue = sum(p.amount for p in payments_db.values())
    
    return {
        "total_transactions": len(transactions_db),
        "completed_transactions": completed_transactions,
        "total_payments": len(payments_db),
        "total_revenue": float(total_revenue),
        "total_invoices": len(invoices_db),
        "paid_invoices": sum(1 for i in invoices_db.values() if i.status == InvoiceStatus.PAID)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
