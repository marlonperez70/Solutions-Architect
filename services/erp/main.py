"""
ERP Microservice - Enterprise Resource Planning
Gestiona operaciones empresariales críticas: inventarios, órdenes, proveedores
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum
import logging

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ERP Microservice",
    description="Gestión de recursos empresariales",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============= MODELOS =============

class InventoryStatus(str, Enum):
    IN_STOCK = "in_stock"
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"
    DISCONTINUED = "discontinued"

class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class InventoryItem(BaseModel):
    id: int
    sku: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    quantity: int = Field(..., ge=0)
    reorder_point: int = Field(..., ge=0)
    unit_cost: float = Field(..., gt=0)
    status: InventoryStatus = InventoryStatus.IN_STOCK
    warehouse_location: str
    last_updated: datetime
    updated_by: int

class CreateInventoryRequest(BaseModel):
    sku: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    quantity: int = Field(..., ge=0)
    reorder_point: int = Field(..., ge=0)
    unit_cost: float = Field(..., gt=0)
    warehouse_location: str

class PurchaseOrder(BaseModel):
    id: int
    order_number: str
    supplier_id: int
    items: List[dict]  # [{sku, quantity, unit_price}]
    total_amount: float
    status: OrderStatus
    order_date: datetime
    expected_delivery: datetime
    actual_delivery: Optional[datetime] = None
    created_by: int

class CreatePurchaseOrderRequest(BaseModel):
    supplier_id: int
    items: List[dict]
    expected_delivery: datetime

class SalesOrder(BaseModel):
    id: int
    order_number: str
    customer_id: int
    items: List[dict]  # [{sku, quantity, unit_price}]
    total_amount: float
    status: OrderStatus
    order_date: datetime
    delivery_date: Optional[datetime] = None
    created_by: int

class CreateSalesOrderRequest(BaseModel):
    customer_id: int
    items: List[dict]
    delivery_date: Optional[datetime] = None

# ============= STORAGE (En producción usar BD) =============

inventory_db: dict[int, InventoryItem] = {}
purchase_orders_db: dict[int, PurchaseOrder] = {}
sales_orders_db: dict[int, SalesOrder] = {}

inventory_counter = 1
purchase_order_counter = 1
sales_order_counter = 1

# ============= INVENTORY ENDPOINTS =============

@app.get("/inventory", tags=["Inventory"])
async def list_inventory(
    status: Optional[InventoryStatus] = None,
    skip: int = 0,
    limit: int = 100
) -> List[InventoryItem]:
    """Listar items de inventario con filtrado opcional"""
    items = list(inventory_db.values())
    
    if status:
        items = [item for item in items if item.status == status]
    
    return items[skip:skip + limit]

@app.get("/inventory/{item_id}", tags=["Inventory"])
async def get_inventory_item(item_id: int) -> InventoryItem:
    """Obtener detalles de un item de inventario"""
    if item_id not in inventory_db:
        raise HTTPException(status_code=404, detail="Item not found")
    return inventory_db[item_id]

@app.post("/inventory", tags=["Inventory"])
async def create_inventory_item(
    request: CreateInventoryRequest,
    user_id: int = 1  # En producción obtener de JWT
) -> InventoryItem:
    """Crear nuevo item de inventario"""
    global inventory_counter
    
    item = InventoryItem(
        id=inventory_counter,
        sku=request.sku,
        name=request.name,
        description=request.description,
        quantity=request.quantity,
        reorder_point=request.reorder_point,
        unit_cost=request.unit_cost,
        warehouse_location=request.warehouse_location,
        last_updated=datetime.now(),
        updated_by=user_id
    )
    
    inventory_db[inventory_counter] = item
    inventory_counter += 1
    
    logger.info(f"Inventory item created: {item.sku}")
    return item

@app.put("/inventory/{item_id}", tags=["Inventory"])
async def update_inventory_item(
    item_id: int,
    quantity: int = Field(..., ge=0),
    user_id: int = 1
) -> InventoryItem:
    """Actualizar cantidad de inventario"""
    if item_id not in inventory_db:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item = inventory_db[item_id]
    item.quantity = quantity
    item.last_updated = datetime.now()
    item.updated_by = user_id
    
    # Actualizar estado
    if quantity == 0:
        item.status = InventoryStatus.OUT_OF_STOCK
    elif quantity <= item.reorder_point:
        item.status = InventoryStatus.LOW_STOCK
    else:
        item.status = InventoryStatus.IN_STOCK
    
    logger.info(f"Inventory updated: {item.sku} -> {quantity} units")
    return item

# ============= PURCHASE ORDER ENDPOINTS =============

@app.get("/purchase-orders", tags=["Purchase Orders"])
async def list_purchase_orders(
    status: Optional[OrderStatus] = None,
    skip: int = 0,
    limit: int = 100
) -> List[PurchaseOrder]:
    """Listar órdenes de compra"""
    orders = list(purchase_orders_db.values())
    
    if status:
        orders = [order for order in orders if order.status == status]
    
    return orders[skip:skip + limit]

@app.post("/purchase-orders", tags=["Purchase Orders"])
async def create_purchase_order(
    request: CreatePurchaseOrderRequest,
    user_id: int = 1
) -> PurchaseOrder:
    """Crear nueva orden de compra"""
    global purchase_order_counter
    
    total = sum(item.get("quantity", 0) * item.get("unit_price", 0) for item in request.items)
    
    order = PurchaseOrder(
        id=purchase_order_counter,
        order_number=f"PO-{purchase_order_counter:06d}",
        supplier_id=request.supplier_id,
        items=request.items,
        total_amount=total,
        status=OrderStatus.PENDING,
        order_date=datetime.now(),
        expected_delivery=request.expected_delivery,
        created_by=user_id
    )
    
    purchase_orders_db[purchase_order_counter] = order
    purchase_order_counter += 1
    
    logger.info(f"Purchase order created: {order.order_number}")
    return order

@app.put("/purchase-orders/{order_id}/status", tags=["Purchase Orders"])
async def update_purchase_order_status(
    order_id: int,
    status: OrderStatus,
    user_id: int = 1
) -> PurchaseOrder:
    """Actualizar estado de orden de compra"""
    if order_id not in purchase_orders_db:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order = purchase_orders_db[order_id]
    order.status = status
    
    if status == OrderStatus.DELIVERED:
        order.actual_delivery = datetime.now()
    
    logger.info(f"Purchase order updated: {order.order_number} -> {status}")
    return order

# ============= SALES ORDER ENDPOINTS =============

@app.get("/sales-orders", tags=["Sales Orders"])
async def list_sales_orders(
    status: Optional[OrderStatus] = None,
    skip: int = 0,
    limit: int = 100
) -> List[SalesOrder]:
    """Listar órdenes de venta"""
    orders = list(sales_orders_db.values())
    
    if status:
        orders = [order for order in orders if order.status == status]
    
    return orders[skip:skip + limit]

@app.post("/sales-orders", tags=["Sales Orders"])
async def create_sales_order(
    request: CreateSalesOrderRequest,
    user_id: int = 1
) -> SalesOrder:
    """Crear nueva orden de venta"""
    global sales_order_counter
    
    total = sum(item.get("quantity", 0) * item.get("unit_price", 0) for item in request.items)
    
    order = SalesOrder(
        id=sales_order_counter,
        order_number=f"SO-{sales_order_counter:06d}",
        customer_id=request.customer_id,
        items=request.items,
        total_amount=total,
        status=OrderStatus.PENDING,
        order_date=datetime.now(),
        delivery_date=request.delivery_date,
        created_by=user_id
    )
    
    sales_orders_db[sales_order_counter] = order
    sales_order_counter += 1
    
    logger.info(f"Sales order created: {order.order_number}")
    return order

# ============= HEALTH CHECK =============

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ERP Microservice",
        "timestamp": datetime.now().isoformat()
    }

# ============= METRICS =============

@app.get("/metrics", tags=["Metrics"])
async def get_metrics():
    """Obtener métricas del servicio"""
    return {
        "inventory_items": len(inventory_db),
        "purchase_orders": len(purchase_orders_db),
        "sales_orders": len(sales_orders_db),
        "low_stock_items": sum(1 for item in inventory_db.values() if item.status == InventoryStatus.LOW_STOCK),
        "pending_orders": sum(1 for order in purchase_orders_db.values() if order.status == OrderStatus.PENDING)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
