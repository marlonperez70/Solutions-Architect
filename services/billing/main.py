from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Billing Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class Invoice(BaseModel):
    id: int
    invoice_number: str
    customer_id: int
    amount: float
    status: str
    created_at: datetime

invoices_db: dict = {}
invoice_counter = 1

@app.post("/api/v1/invoices")
async def create_invoice(customer_id: int, amount: float):
    global invoice_counter
    invoice = {"id": invoice_counter, "invoice_number": f"INV-{invoice_counter:06d}", "customer_id": customer_id, "amount": amount, "status": "issued", "created_at": datetime.now()}
    invoices_db[invoice_counter] = invoice
    invoice_counter += 1
    logger.info(f"Factura creada: {invoice['invoice_number']}")
    return invoice

@app.get("/api/v1/invoices/{invoice_id}")
async def get_invoice(invoice_id: int):
    if invoice_id not in invoices_db:
        return {"error": "Factura no encontrada"}
    return invoices_db[invoice_id]

@app.post("/api/v1/billing-cycles")
async def create_billing_cycle(period: str):
    return {"status": "ok", "period": period, "created_at": datetime.now()}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Billing"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)
