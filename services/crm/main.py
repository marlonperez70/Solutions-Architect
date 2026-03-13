"""
CRM Microservice - Customer Relationship Management
Gestiona clientes, contactos, oportunidades y campañas
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime
from enum import Enum
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CRM Microservice",
    description="Gestión de relaciones con clientes",
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

class CustomerType(str, Enum):
    INDIVIDUAL = "individual"
    CORPORATE = "corporate"
    GOVERNMENT = "government"

class CustomerStatus(str, Enum):
    PROSPECT = "prospect"
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class OpportunityStage(str, Enum):
    LEAD = "lead"
    QUALIFICATION = "qualification"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"

class Customer(BaseModel):
    id: int
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    type: CustomerType
    status: CustomerStatus
    industry: Optional[str] = None
    annual_revenue: Optional[float] = None
    employees: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    created_by: int

class CreateCustomerRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    type: CustomerType
    industry: Optional[str] = None
    annual_revenue: Optional[float] = None
    employees: Optional[int] = None

class Contact(BaseModel):
    id: int
    customer_id: int
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    is_primary: bool = False
    created_at: datetime

class CreateContactRequest(BaseModel):
    customer_id: int
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    is_primary: bool = False

class Opportunity(BaseModel):
    id: int
    customer_id: int
    title: str
    description: Optional[str] = None
    value: float = Field(..., gt=0)
    stage: OpportunityStage
    probability: int = Field(..., ge=0, le=100)
    expected_close_date: datetime
    assigned_to: int
    created_at: datetime
    updated_at: datetime

class CreateOpportunityRequest(BaseModel):
    customer_id: int
    title: str
    description: Optional[str] = None
    value: float = Field(..., gt=0)
    stage: OpportunityStage = OpportunityStage.LEAD
    probability: int = Field(default=25, ge=0, le=100)
    expected_close_date: datetime
    assigned_to: int

# ============= STORAGE =============

customers_db: dict[int, Customer] = {}
contacts_db: dict[int, Contact] = {}
opportunities_db: dict[int, Opportunity] = {}

customer_counter = 1
contact_counter = 1
opportunity_counter = 1

# ============= CUSTOMER ENDPOINTS =============

@app.get("/customers", tags=["Customers"])
async def list_customers(
    status: Optional[CustomerStatus] = None,
    type: Optional[CustomerType] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Customer]:
    """Listar clientes con filtrado opcional"""
    customers = list(customers_db.values())
    
    if status:
        customers = [c for c in customers if c.status == status]
    if type:
        customers = [c for c in customers if c.type == type]
    
    return customers[skip:skip + limit]

@app.get("/customers/{customer_id}", tags=["Customers"])
async def get_customer(customer_id: int) -> Customer:
    """Obtener detalles del cliente"""
    if customer_id not in customers_db:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customers_db[customer_id]

@app.post("/customers", tags=["Customers"])
async def create_customer(
    request: CreateCustomerRequest,
    user_id: int = 1
) -> Customer:
    """Crear nuevo cliente"""
    global customer_counter
    
    customer = Customer(
        id=customer_counter,
        name=request.name,
        email=request.email,
        phone=request.phone,
        type=request.type,
        status=CustomerStatus.PROSPECT,
        industry=request.industry,
        annual_revenue=request.annual_revenue,
        employees=request.employees,
        created_at=datetime.now(),
        updated_at=datetime.now(),
        created_by=user_id
    )
    
    customers_db[customer_counter] = customer
    customer_counter += 1
    
    logger.info(f"Customer created: {customer.name}")
    return customer

@app.put("/customers/{customer_id}/status", tags=["Customers"])
async def update_customer_status(
    customer_id: int,
    status: CustomerStatus
) -> Customer:
    """Actualizar estado del cliente"""
    if customer_id not in customers_db:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    customer = customers_db[customer_id]
    customer.status = status
    customer.updated_at = datetime.now()
    
    logger.info(f"Customer status updated: {customer.name} -> {status}")
    return customer

# ============= CONTACT ENDPOINTS =============

@app.get("/customers/{customer_id}/contacts", tags=["Contacts"])
async def list_contacts(customer_id: int) -> List[Contact]:
    """Listar contactos de un cliente"""
    return [c for c in contacts_db.values() if c.customer_id == customer_id]

@app.post("/contacts", tags=["Contacts"])
async def create_contact(request: CreateContactRequest) -> Contact:
    """Crear nuevo contacto"""
    global contact_counter
    
    if request.customer_id not in customers_db:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    contact = Contact(
        id=contact_counter,
        customer_id=request.customer_id,
        first_name=request.first_name,
        last_name=request.last_name,
        email=request.email,
        phone=request.phone,
        position=request.position,
        department=request.department,
        is_primary=request.is_primary,
        created_at=datetime.now()
    )
    
    contacts_db[contact_counter] = contact
    contact_counter += 1
    
    logger.info(f"Contact created: {contact.first_name} {contact.last_name}")
    return contact

# ============= OPPORTUNITY ENDPOINTS =============

@app.get("/opportunities", tags=["Opportunities"])
async def list_opportunities(
    stage: Optional[OpportunityStage] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Opportunity]:
    """Listar oportunidades"""
    opps = list(opportunities_db.values())
    
    if stage:
        opps = [o for o in opps if o.stage == stage]
    
    return opps[skip:skip + limit]

@app.post("/opportunities", tags=["Opportunities"])
async def create_opportunity(request: CreateOpportunityRequest) -> Opportunity:
    """Crear nueva oportunidad"""
    global opportunity_counter
    
    if request.customer_id not in customers_db:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    opportunity = Opportunity(
        id=opportunity_counter,
        customer_id=request.customer_id,
        title=request.title,
        description=request.description,
        value=request.value,
        stage=request.stage,
        probability=request.probability,
        expected_close_date=request.expected_close_date,
        assigned_to=request.assigned_to,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    opportunities_db[opportunity_counter] = opportunity
    opportunity_counter += 1
    
    logger.info(f"Opportunity created: {opportunity.title}")
    return opportunity

@app.put("/opportunities/{opportunity_id}/stage", tags=["Opportunities"])
async def update_opportunity_stage(
    opportunity_id: int,
    stage: OpportunityStage,
    probability: int = Field(..., ge=0, le=100)
) -> Opportunity:
    """Actualizar etapa de oportunidad"""
    if opportunity_id not in opportunities_db:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    opp = opportunities_db[opportunity_id]
    opp.stage = stage
    opp.probability = probability
    opp.updated_at = datetime.now()
    
    logger.info(f"Opportunity updated: {opp.title} -> {stage}")
    return opp

# ============= HEALTH CHECK =============

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "CRM Microservice",
        "timestamp": datetime.now().isoformat()
    }

# ============= METRICS =============

@app.get("/metrics", tags=["Metrics"])
async def get_metrics():
    """Obtener métricas del servicio"""
    active_customers = sum(1 for c in customers_db.values() if c.status == CustomerStatus.ACTIVE)
    pipeline_value = sum(o.value for o in opportunities_db.values() if o.stage != OpportunityStage.CLOSED_LOST)
    
    return {
        "total_customers": len(customers_db),
        "active_customers": active_customers,
        "total_contacts": len(contacts_db),
        "total_opportunities": len(opportunities_db),
        "pipeline_value": pipeline_value
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
