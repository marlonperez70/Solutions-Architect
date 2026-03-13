"""
Billing Microservice - Sistema de Facturación Empresarial
Gestiona facturas, ciclos de facturación, ajustes y reportes financieros
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
from enum import Enum
from decimal import Decimal
import logging
import uuid

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Billing Microservice",
    description="Sistema de facturación empresarial",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============= ENUMS =============

class BillingCycle(str, Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUAL = "annual"

class BillingStatus(str, Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class LineItemType(str, Enum):
    PRODUCT = "product"
    SERVICE = "service"
    TAX = "tax"
    DISCOUNT = "discount"
    ADJUSTMENT = "adjustment"

# ============= MODELS =============

class LineItem(BaseModel):
    id: Optional[str] = None
    description: str
    type: LineItemType
    quantity: Decimal = Field(..., gt=0)
    unit_price: Decimal = Field(..., gt=0)
    amount: Decimal = Field(..., gt=0)

class BillingAccount(BaseModel):
    id: int
    customer_id: int
    billing_cycle: BillingCycle
    billing_email: str
    tax_id: Optional[str] = None
    payment_terms_days: int = 30
    auto_pay_enabled: bool = False
    created_at: datetime
    updated_at: datetime

class CreateBillingAccountRequest(BaseModel):
    customer_id: int
    billing_cycle: BillingCycle
    billing_email: str
    tax_id: Optional[str] = None
    payment_terms_days: int = 30
    auto_pay_enabled: bool = False

class Invoice(BaseModel):
    id: str
    billing_account_id: int
    invoice_number: str
    issue_date: datetime
    due_date: datetime
    subtotal: Decimal = Field(..., gt=0)
    tax_amount: Decimal = Field(default=Decimal("0"), ge=0)
    discount_amount: Decimal = Field(default=Decimal("0"), ge=0)
    total_amount: Decimal = Field(..., gt=0)
    status: BillingStatus
    line_items: List[LineItem]
    notes: Optional[str] = None
    created_at: datetime

class CreateInvoiceRequest(BaseModel):
    billing_account_id: int
    line_items: List[LineItem]
    tax_rate: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    discount_amount: Decimal = Field(default=Decimal("0"), ge=0)
    notes: Optional[str] = None

class BillingAdjustment(BaseModel):
    id: str
    invoice_id: str
    adjustment_type: str
    amount: Decimal
    reason: str
    created_at: datetime
    created_by: int

class CreateAdjustmentRequest(BaseModel):
    invoice_id: str
    adjustment_type: str
    amount: Decimal
    reason: str

# ============= STORAGE =============

billing_accounts_db: dict[int, BillingAccount] = {}
invoices_db: dict[str, Invoice] = {}
adjustments_db: dict[str, BillingAdjustment] = {}

account_counter = 1
invoice_counter = 1000

# ============= BILLING ACCOUNT ENDPOINTS =============

@app.post("/billing-accounts", tags=["Billing Accounts"])
async def create_billing_account(request: CreateBillingAccountRequest) -> BillingAccount:
    """Crear cuenta de facturación para cliente"""
    global account_counter
    
    account = BillingAccount(
        id=account_counter,
        customer_id=request.customer_id,
        billing_cycle=request.billing_cycle,
        billing_email=request.billing_email,
        tax_id=request.tax_id,
        payment_terms_days=request.payment_terms_days,
        auto_pay_enabled=request.auto_pay_enabled,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    billing_accounts_db[account_counter] = account
    account_counter += 1
    
    logger.info(f"Billing account created for customer {request.customer_id}")
    return account

@app.get("/billing-accounts/{account_id}", tags=["Billing Accounts"])
async def get_billing_account(account_id: int) -> BillingAccount:
    """Obtener cuenta de facturación"""
    if account_id not in billing_accounts_db:
        raise HTTPException(status_code=404, detail="Billing account not found")
    return billing_accounts_db[account_id]

@app.get("/customers/{customer_id}/billing-account", tags=["Billing Accounts"])
async def get_customer_billing_account(customer_id: int) -> BillingAccount:
    """Obtener cuenta de facturación de cliente"""
    for account in billing_accounts_db.values():
        if account.customer_id == customer_id:
            return account
    raise HTTPException(status_code=404, detail="Billing account not found for customer")

# ============= INVOICE ENDPOINTS =============

@app.post("/invoices", tags=["Invoices"])
async def create_invoice(request: CreateInvoiceRequest) -> Invoice:
    """Crear factura"""
    global invoice_counter
    
    if request.billing_account_id not in billing_accounts_db:
        raise HTTPException(status_code=404, detail="Billing account not found")
    
    # Calcular totales
    subtotal = sum(item.amount for item in request.line_items)
    tax_amount = subtotal * (request.tax_rate / Decimal("100"))
    total_amount = subtotal + tax_amount - request.discount_amount
    
    invoice_id = str(uuid.uuid4())
    invoice_number = f"INV-{invoice_counter:06d}"
    invoice_counter += 1
    
    account = billing_accounts_db[request.billing_account_id]
    issue_date = datetime.now()
    due_date = issue_date + timedelta(days=account.payment_terms_days)
    
    invoice = Invoice(
        id=invoice_id,
        billing_account_id=request.billing_account_id,
        invoice_number=invoice_number,
        issue_date=issue_date,
        due_date=due_date,
        subtotal=subtotal,
        tax_amount=tax_amount,
        discount_amount=request.discount_amount,
        total_amount=total_amount,
        status=BillingStatus.DRAFT,
        line_items=request.line_items,
        notes=request.notes,
        created_at=datetime.now()
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

@app.get("/billing-accounts/{account_id}/invoices", tags=["Invoices"])
async def get_account_invoices(
    account_id: int,
    status: Optional[BillingStatus] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Invoice]:
    """Obtener facturas de cuenta"""
    invoices = [i for i in invoices_db.values() if i.billing_account_id == account_id]
    
    if status:
        invoices = [i for i in invoices if i.status == status]
    
    return invoices[skip:skip + limit]

@app.put("/invoices/{invoice_id}/status", tags=["Invoices"])
async def update_invoice_status(invoice_id: str, status: BillingStatus) -> Invoice:
    """Actualizar estado de factura"""
    if invoice_id not in invoices_db:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice = invoices_db[invoice_id]
    invoice.status = status
    
    logger.info(f"Invoice {invoice.invoice_number} status updated to {status}")
    return invoice

# ============= ADJUSTMENT ENDPOINTS =============

@app.post("/adjustments", tags=["Adjustments"])
async def create_adjustment(request: CreateAdjustmentRequest, user_id: int = 1) -> BillingAdjustment:
    """Crear ajuste de facturación"""
    if request.invoice_id not in invoices_db:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    adjustment_id = str(uuid.uuid4())
    
    adjustment = BillingAdjustment(
        id=adjustment_id,
        invoice_id=request.invoice_id,
        adjustment_type=request.adjustment_type,
        amount=request.amount,
        reason=request.reason,
        created_at=datetime.now(),
        created_by=user_id
    )
    
    # Actualizar total de factura
    invoice = invoices_db[request.invoice_id]
    invoice.total_amount += request.amount
    
    adjustments_db[adjustment_id] = adjustment
    
    logger.info(f"Adjustment created for invoice {invoice.invoice_number}")
    return adjustment

@app.get("/invoices/{invoice_id}/adjustments", tags=["Adjustments"])
async def get_invoice_adjustments(invoice_id: str) -> List[BillingAdjustment]:
    """Obtener ajustes de factura"""
    return [a for a in adjustments_db.values() if a.invoice_id == invoice_id]

# ============= REPORTING ENDPOINTS =============

@app.get("/reports/revenue", tags=["Reports"])
async def get_revenue_report(
    start_date: datetime,
    end_date: datetime
) -> dict:
    """Obtener reporte de ingresos"""
    period_invoices = [
        i for i in invoices_db.values()
        if start_date <= i.issue_date <= end_date and i.status == BillingStatus.PAID
    ]
    
    total_revenue = sum(i.total_amount for i in period_invoices)
    total_tax = sum(i.tax_amount for i in period_invoices)
    
    return {
        "period": f"{start_date.date()} to {end_date.date()}",
        "total_revenue": float(total_revenue),
        "total_tax": float(total_tax),
        "invoice_count": len(period_invoices),
        "average_invoice_value": float(total_revenue / len(period_invoices)) if period_invoices else 0
    }

@app.get("/reports/aging", tags=["Reports"])
async def get_aging_report() -> dict:
    """Obtener reporte de antigüedad de facturas"""
    today = datetime.now()
    
    current = [i for i in invoices_db.values() if i.due_date >= today and i.status != BillingStatus.PAID]
    overdue_30 = [i for i in invoices_db.values() if today - timedelta(days=30) <= i.due_date < today and i.status != BillingStatus.PAID]
    overdue_60 = [i for i in invoices_db.values() if today - timedelta(days=60) <= i.due_date < today - timedelta(days=30) and i.status != BillingStatus.PAID]
    overdue_90 = [i for i in invoices_db.values() if i.due_date < today - timedelta(days=60) and i.status != BillingStatus.PAID]
    
    return {
        "current": {
            "count": len(current),
            "amount": float(sum(i.total_amount for i in current))
        },
        "overdue_30": {
            "count": len(overdue_30),
            "amount": float(sum(i.total_amount for i in overdue_30))
        },
        "overdue_60": {
            "count": len(overdue_60),
            "amount": float(sum(i.total_amount for i in overdue_60))
        },
        "overdue_90": {
            "count": len(overdue_90),
            "amount": float(sum(i.total_amount for i in overdue_90))
        }
    }

# ============= HEALTH CHECK =============

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Billing Microservice",
        "timestamp": datetime.now().isoformat()
    }

# ============= METRICS =============

@app.get("/metrics", tags=["Metrics"])
async def get_metrics():
    """Obtener métricas del servicio"""
    paid_invoices = sum(1 for i in invoices_db.values() if i.status == BillingStatus.PAID)
    total_billed = sum(i.total_amount for i in invoices_db.values())
    
    return {
        "total_accounts": len(billing_accounts_db),
        "total_invoices": len(invoices_db),
        "paid_invoices": paid_invoices,
        "total_billed": float(total_billed),
        "total_adjustments": len(adjustments_db)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
