"""
Inventory Microservice - Gestión de Inventarios
Gestiona productos, stock, movimientos y reabastecimiento
"""

from fastapi import FastAPI, HTTPException, Query
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
    title="Inventory Microservice",
    description="Gestión de inventarios empresarial",
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

class ProductStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    DISCONTINUED = "discontinued"

class MovementType(str, Enum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"
    ADJUSTMENT = "adjustment"
    RETURN = "return"
    DAMAGE = "damage"

class WarehouseLocation(str, Enum):
    WAREHOUSE_A = "warehouse_a"
    WAREHOUSE_B = "warehouse_b"
    WAREHOUSE_C = "warehouse_c"
    RETAIL_STORE = "retail_store"

# ============= MODELS =============

class Product(BaseModel):
    id: str
    sku: str
    name: str
    description: Optional[str] = None
    category: str
    unit_price: Decimal = Field(..., gt=0)
    status: ProductStatus
    reorder_point: int = Field(..., ge=0)
    reorder_quantity: int = Field(..., gt=0)
    created_at: datetime
    updated_at: datetime

class CreateProductRequest(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    category: str
    unit_price: Decimal = Field(..., gt=0)
    reorder_point: int = Field(..., ge=0)
    reorder_quantity: int = Field(..., gt=0)

class StockLevel(BaseModel):
    id: str
    product_id: str
    warehouse: WarehouseLocation
    quantity_on_hand: int = Field(..., ge=0)
    quantity_reserved: int = Field(..., ge=0)
    quantity_available: int = Field(..., ge=0)
    last_counted_at: datetime
    updated_at: datetime

class InventoryMovement(BaseModel):
    id: str
    product_id: str
    warehouse: WarehouseLocation
    movement_type: MovementType
    quantity: int = Field(..., gt=0)
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    created_by: int

class CreateMovementRequest(BaseModel):
    product_id: str
    warehouse: WarehouseLocation
    movement_type: MovementType
    quantity: int = Field(..., gt=0)
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class LowStockAlert(BaseModel):
    id: str
    product_id: str
    warehouse: WarehouseLocation
    current_quantity: int
    reorder_point: int
    created_at: datetime

# ============= STORAGE =============

products_db: dict[str, Product] = {}
stock_levels_db: dict[str, StockLevel] = {}
movements_db: dict[str, InventoryMovement] = {}
alerts_db: dict[str, LowStockAlert] = {}

# ============= PRODUCT ENDPOINTS =============

@app.post("/products", tags=["Products"])
async def create_product(request: CreateProductRequest) -> Product:
    """Crear nuevo producto"""
    product_id = str(uuid.uuid4())
    
    product = Product(
        id=product_id,
        sku=request.sku,
        name=request.name,
        description=request.description,
        category=request.category,
        unit_price=request.unit_price,
        status=ProductStatus.ACTIVE,
        reorder_point=request.reorder_point,
        reorder_quantity=request.reorder_quantity,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    products_db[product_id] = product
    
    # Crear niveles de stock para cada almacén
    for warehouse in WarehouseLocation:
        stock_id = str(uuid.uuid4())
        stock_levels_db[stock_id] = StockLevel(
            id=stock_id,
            product_id=product_id,
            warehouse=warehouse,
            quantity_on_hand=0,
            quantity_reserved=0,
            quantity_available=0,
            last_counted_at=datetime.now(),
            updated_at=datetime.now()
        )
    
    logger.info(f"Product created: {request.sku}")
    return product

@app.get("/products/{product_id}", tags=["Products"])
async def get_product(product_id: str) -> Product:
    """Obtener detalles del producto"""
    if product_id not in products_db:
        raise HTTPException(status_code=404, detail="Product not found")
    return products_db[product_id]

@app.get("/products", tags=["Products"])
async def list_products(
    category: Optional[str] = None,
    status: Optional[ProductStatus] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Product]:
    """Listar productos"""
    products = list(products_db.values())
    
    if category:
        products = [p for p in products if p.category == category]
    if status:
        products = [p for p in products if p.status == status]
    
    return products[skip:skip + limit]

@app.get("/products/sku/{sku}", tags=["Products"])
async def get_product_by_sku(sku: str) -> Product:
    """Obtener producto por SKU"""
    for product in products_db.values():
        if product.sku == sku:
            return product
    raise HTTPException(status_code=404, detail="Product not found")

# ============= STOCK LEVEL ENDPOINTS =============

@app.get("/stock/{product_id}", tags=["Stock"])
async def get_product_stock(product_id: str) -> List[StockLevel]:
    """Obtener niveles de stock por producto"""
    if product_id not in products_db:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return [s for s in stock_levels_db.values() if s.product_id == product_id]

@app.get("/stock/{product_id}/{warehouse}", tags=["Stock"])
async def get_warehouse_stock(product_id: str, warehouse: WarehouseLocation) -> StockLevel:
    """Obtener stock en almacén específico"""
    for stock in stock_levels_db.values():
        if stock.product_id == product_id and stock.warehouse == warehouse:
            return stock
    raise HTTPException(status_code=404, detail="Stock level not found")

@app.put("/stock/{product_id}/{warehouse}/adjust", tags=["Stock"])
async def adjust_stock(
    product_id: str,
    warehouse: WarehouseLocation,
    quantity: int
) -> StockLevel:
    """Ajustar cantidad de stock"""
    if product_id not in products_db:
        raise HTTPException(status_code=404, detail="Product not found")
    
    for stock in stock_levels_db.values():
        if stock.product_id == product_id and stock.warehouse == warehouse:
            stock.quantity_on_hand = max(0, stock.quantity_on_hand + quantity)
            stock.quantity_available = stock.quantity_on_hand - stock.quantity_reserved
            stock.updated_at = datetime.now()
            
            logger.info(f"Stock adjusted for {product_id} in {warehouse}")
            return stock
    
    raise HTTPException(status_code=404, detail="Stock level not found")

# ============= MOVEMENT ENDPOINTS =============

@app.post("/movements", tags=["Movements"])
async def record_movement(request: CreateMovementRequest, user_id: int = 1) -> InventoryMovement:
    """Registrar movimiento de inventario"""
    if request.product_id not in products_db:
        raise HTTPException(status_code=404, detail="Product not found")
    
    movement_id = str(uuid.uuid4())
    
    movement = InventoryMovement(
        id=movement_id,
        product_id=request.product_id,
        warehouse=request.warehouse,
        movement_type=request.movement_type,
        quantity=request.quantity,
        reference_number=request.reference_number,
        notes=request.notes,
        created_at=datetime.now(),
        created_by=user_id
    )
    
    # Actualizar stock
    for stock in stock_levels_db.values():
        if stock.product_id == request.product_id and stock.warehouse == request.warehouse:
            if request.movement_type == MovementType.INBOUND:
                stock.quantity_on_hand += request.quantity
            elif request.movement_type in [MovementType.OUTBOUND, MovementType.DAMAGE]:
                stock.quantity_on_hand = max(0, stock.quantity_on_hand - request.quantity)
            elif request.movement_type == MovementType.RETURN:
                stock.quantity_on_hand += request.quantity
            
            stock.quantity_available = stock.quantity_on_hand - stock.quantity_reserved
            stock.updated_at = datetime.now()
            
            # Verificar si necesita reorden
            product = products_db[request.product_id]
            if stock.quantity_available <= product.reorder_point:
                alert_id = str(uuid.uuid4())
                alerts_db[alert_id] = LowStockAlert(
                    id=alert_id,
                    product_id=request.product_id,
                    warehouse=request.warehouse,
                    current_quantity=stock.quantity_available,
                    reorder_point=product.reorder_point,
                    created_at=datetime.now()
                )
                logger.warning(f"Low stock alert for {request.product_id} in {request.warehouse}")
            
            break
    
    movements_db[movement_id] = movement
    
    logger.info(f"Movement recorded: {movement_id}")
    return movement

@app.get("/movements", tags=["Movements"])
async def list_movements(
    product_id: Optional[str] = None,
    warehouse: Optional[WarehouseLocation] = None,
    movement_type: Optional[MovementType] = None,
    skip: int = 0,
    limit: int = 100
) -> List[InventoryMovement]:
    """Listar movimientos de inventario"""
    movements = list(movements_db.values())
    
    if product_id:
        movements = [m for m in movements if m.product_id == product_id]
    if warehouse:
        movements = [m for m in movements if m.warehouse == warehouse]
    if movement_type:
        movements = [m for m in movements if m.movement_type == movement_type]
    
    return movements[skip:skip + limit]

# ============= ALERTS ENDPOINTS =============

@app.get("/alerts/low-stock", tags=["Alerts"])
async def get_low_stock_alerts() -> List[LowStockAlert]:
    """Obtener alertas de stock bajo"""
    return list(alerts_db.values())

@app.get("/alerts/low-stock/{product_id}", tags=["Alerts"])
async def get_product_alerts(product_id: str) -> List[LowStockAlert]:
    """Obtener alertas de producto específico"""
    return [a for a in alerts_db.values() if a.product_id == product_id]

# ============= REPORTING ENDPOINTS =============

@app.get("/reports/inventory-value", tags=["Reports"])
async def get_inventory_value_report() -> dict:
    """Obtener reporte de valor de inventario"""
    total_value = Decimal("0")
    total_units = 0
    
    for stock in stock_levels_db.values():
        if stock.product_id in products_db:
            product = products_db[stock.product_id]
            total_value += product.unit_price * stock.quantity_on_hand
            total_units += stock.quantity_on_hand
    
    return {
        "total_inventory_value": float(total_value),
        "total_units": total_units,
        "average_unit_value": float(total_value / total_units) if total_units > 0 else 0
    }

@app.get("/reports/stock-status", tags=["Reports"])
async def get_stock_status_report() -> dict:
    """Obtener reporte de estado de stock"""
    low_stock_count = sum(1 for a in alerts_db.values())
    out_of_stock = sum(1 for s in stock_levels_db.values() if s.quantity_available == 0)
    
    return {
        "total_products": len(products_db),
        "low_stock_items": low_stock_count,
        "out_of_stock_items": out_of_stock,
        "warehouses": len(set(s.warehouse for s in stock_levels_db.values()))
    }

# ============= HEALTH CHECK =============

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Inventory Microservice",
        "timestamp": datetime.now().isoformat()
    }

# ============= METRICS =============

@app.get("/metrics", tags=["Metrics"])
async def get_metrics():
    """Obtener métricas del servicio"""
    return {
        "total_products": len(products_db),
        "total_stock_locations": len(stock_levels_db),
        "total_movements": len(movements_db),
        "active_alerts": len(alerts_db)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
