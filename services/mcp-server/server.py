"""
MCP Server - Model Context Protocol Server
Permite a modelos de IA acceder de forma segura a datos empresariales
"""

import json
import logging
from typing import Any, Optional
from datetime import datetime
from enum import Enum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============= ENUMS =============

class AccessLevel(str, Enum):
    READ_ONLY = "read_only"
    READ_WRITE = "read_write"
    ADMIN = "admin"

class DataClassification(str, Enum):
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"

# ============= MODELS =============

class MCPContext:
    """Contexto de seguridad para acceso de IA"""
    
    def __init__(
        self,
        ai_model_id: str,
        access_level: AccessLevel,
        allowed_tables: list[str],
        max_records: int = 10000,
        data_classification: DataClassification = DataClassification.INTERNAL
    ):
        self.ai_model_id = ai_model_id
        self.access_level = access_level
        self.allowed_tables = allowed_tables
        self.max_records = max_records
        self.data_classification = data_classification
        self.created_at = datetime.now()
        self.last_accessed = datetime.now()
        self.access_count = 0

class QueryRequest:
    """Solicitud de consulta de IA"""
    
    def __init__(
        self,
        query: str,
        table: str,
        filters: Optional[dict] = None,
        limit: int = 100,
        offset: int = 0
    ):
        self.query = query
        self.table = table
        self.filters = filters or {}
        self.limit = limit
        self.offset = offset
        self.timestamp = datetime.now()

class QueryResponse:
    """Respuesta de consulta"""
    
    def __init__(
        self,
        success: bool,
        data: Optional[list] = None,
        error: Optional[str] = None,
        metadata: Optional[dict] = None
    ):
        self.success = success
        self.data = data or []
        self.error = error
        self.metadata = metadata or {}
        self.timestamp = datetime.now()

# ============= MCP SERVER =============

class MCPServer:
    """Servidor MCP para acceso seguro a BD"""
    
    def __init__(self):
        self.contexts: dict[str, MCPContext] = {}
        self.query_log: list[dict] = []
        self.audit_log: list[dict] = []
        
        # Definir esquema de tablas permitidas
        self.allowed_tables = {
            "users": {
                "columns": ["id", "name", "email", "role", "createdAt"],
                "classification": DataClassification.CONFIDENTIAL
            },
            "transactions": {
                "columns": ["id", "customer_id", "amount", "status", "createdAt"],
                "classification": DataClassification.CONFIDENTIAL
            },
            "customers": {
                "columns": ["id", "name", "email", "industry", "status"],
                "classification": DataClassification.INTERNAL
            },
            "orders": {
                "columns": ["id", "customer_id", "total_amount", "status", "createdAt"],
                "classification": DataClassification.INTERNAL
            },
            "products": {
                "columns": ["id", "sku", "name", "category", "unit_price"],
                "classification": DataClassification.PUBLIC
            },
            "inventory": {
                "columns": ["id", "product_id", "warehouse", "quantity_on_hand"],
                "classification": DataClassification.INTERNAL
            },
            "metrics": {
                "columns": ["id", "category", "name", "value", "timestamp"],
                "classification": DataClassification.INTERNAL
            }
        }
        
        logger.info("MCP Server initialized")
    
    def register_ai_model(
        self,
        model_id: str,
        access_level: AccessLevel,
        allowed_tables: list[str],
        data_classification: DataClassification = DataClassification.INTERNAL
    ) -> MCPContext:
        """Registrar modelo de IA con permisos específicos"""
        
        # Validar tablas permitidas
        for table in allowed_tables:
            if table not in self.allowed_tables:
                raise ValueError(f"Table {table} not allowed")
        
        context = MCPContext(
            ai_model_id=model_id,
            access_level=access_level,
            allowed_tables=allowed_tables,
            data_classification=data_classification
        )
        
        self.contexts[model_id] = context
        
        self.audit_log.append({
            "event": "model_registered",
            "model_id": model_id,
            "access_level": access_level.value,
            "timestamp": datetime.now().isoformat()
        })
        
        logger.info(f"AI model {model_id} registered with {access_level.value} access")
        return context
    
    def validate_query(
        self,
        model_id: str,
        request: QueryRequest
    ) -> tuple[bool, Optional[str]]:
        """Validar que la consulta cumple con políticas de seguridad"""
        
        # Verificar que el modelo está registrado
        if model_id not in self.contexts:
            return False, f"Model {model_id} not registered"
        
        context = self.contexts[model_id]
        
        # Verificar que la tabla está permitida
        if request.table not in context.allowed_tables:
            return False, f"Table {request.table} not allowed for this model"
        
        # Verificar límite de registros
        if request.limit > context.max_records:
            return False, f"Limit exceeds maximum allowed ({context.max_records})"
        
        # Verificar clasificación de datos
        table_classification = self.allowed_tables[request.table]["classification"]
        if table_classification.value > context.data_classification.value:
            return False, f"Data classification {table_classification.value} exceeds model access level"
        
        # Verificar acceso de escritura
        if "UPDATE" in request.query.upper() or "DELETE" in request.query.upper():
            if context.access_level == AccessLevel.READ_ONLY:
                return False, "Write operations not allowed for this model"
        
        return True, None
    
    def execute_query(
        self,
        model_id: str,
        request: QueryRequest
    ) -> QueryResponse:
        """Ejecutar consulta con validaciones de seguridad"""
        
        # Validar consulta
        is_valid, error_msg = self.validate_query(model_id, request)
        if not is_valid:
            self.audit_log.append({
                "event": "query_rejected",
                "model_id": model_id,
                "table": request.table,
                "reason": error_msg,
                "timestamp": datetime.now().isoformat()
            })
            return QueryResponse(success=False, error=error_msg)
        
        # Actualizar contexto
        context = self.contexts[model_id]
        context.last_accessed = datetime.now()
        context.access_count += 1
        
        # Simular ejecución de consulta
        # En producción, esto conectaría a la BD real
        mock_data = self._get_mock_data(request.table, request.limit)
        
        # Registrar consulta
        self.query_log.append({
            "model_id": model_id,
            "table": request.table,
            "filters": request.filters,
            "limit": request.limit,
            "timestamp": datetime.now().isoformat(),
            "records_returned": len(mock_data)
        })
        
        self.audit_log.append({
            "event": "query_executed",
            "model_id": model_id,
            "table": request.table,
            "records": len(mock_data),
            "timestamp": datetime.now().isoformat()
        })
        
        logger.info(f"Query executed for {model_id} on table {request.table}: {len(mock_data)} records")
        
        return QueryResponse(
            success=True,
            data=mock_data,
            metadata={
                "table": request.table,
                "total_records": len(mock_data),
                "limit": request.limit,
                "offset": request.offset
            }
        )
    
    def _get_mock_data(self, table: str, limit: int) -> list[dict]:
        """Obtener datos mock para demostración"""
        
        mock_data_map = {
            "customers": [
                {"id": 1, "name": "Acme Corp", "email": "contact@acme.com", "industry": "Technology", "status": "active"},
                {"id": 2, "name": "Global Industries", "email": "info@global.com", "industry": "Manufacturing", "status": "active"},
                {"id": 3, "name": "Tech Ventures", "email": "hello@techventures.com", "industry": "Technology", "status": "active"},
            ],
            "transactions": [
                {"id": 1, "customer_id": 1, "amount": 5000.00, "status": "completed", "createdAt": "2026-03-13T10:00:00"},
                {"id": 2, "customer_id": 2, "amount": 3500.00, "status": "completed", "createdAt": "2026-03-13T11:00:00"},
                {"id": 3, "customer_id": 3, "amount": 7200.00, "status": "pending", "createdAt": "2026-03-13T12:00:00"},
            ],
            "orders": [
                {"id": 1, "customer_id": 1, "total_amount": 5000.00, "status": "shipped", "createdAt": "2026-03-10T09:00:00"},
                {"id": 2, "customer_id": 2, "total_amount": 3500.00, "status": "processing", "createdAt": "2026-03-12T14:00:00"},
            ],
            "products": [
                {"id": 1, "sku": "PROD-001", "name": "Enterprise Software License", "category": "Software", "unit_price": 1000.00},
                {"id": 2, "sku": "PROD-002", "name": "Support Package", "category": "Services", "unit_price": 500.00},
            ],
            "inventory": [
                {"id": 1, "product_id": 1, "warehouse": "warehouse_a", "quantity_on_hand": 150},
                {"id": 2, "product_id": 2, "warehouse": "warehouse_b", "quantity_on_hand": 300},
            ],
            "metrics": [
                {"id": 1, "category": "revenue", "name": "daily_revenue", "value": 15700.00, "timestamp": "2026-03-13T23:59:59"},
                {"id": 2, "category": "performance", "name": "api_response_time_ms", "value": 45.2, "timestamp": "2026-03-13T23:59:59"},
            ]
        }
        
        return mock_data_map.get(table, [])[:limit]
    
    def get_context_info(self, model_id: str) -> dict:
        """Obtener información del contexto de modelo"""
        
        if model_id not in self.contexts:
            return {"error": f"Model {model_id} not found"}
        
        context = self.contexts[model_id]
        
        return {
            "model_id": context.ai_model_id,
            "access_level": context.access_level.value,
            "allowed_tables": context.allowed_tables,
            "max_records": context.max_records,
            "data_classification": context.data_classification.value,
            "created_at": context.created_at.isoformat(),
            "last_accessed": context.last_accessed.isoformat(),
            "access_count": context.access_count
        }
    
    def get_audit_log(self, limit: int = 100) -> list[dict]:
        """Obtener log de auditoría"""
        return self.audit_log[-limit:]
    
    def get_query_log(self, model_id: Optional[str] = None, limit: int = 100) -> list[dict]:
        """Obtener log de consultas"""
        
        logs = self.query_log
        if model_id:
            logs = [l for l in logs if l["model_id"] == model_id]
        
        return logs[-limit:]

# ============= FASTAPI WRAPPER =============

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="MCP Server",
    description="Model Context Protocol Server para acceso seguro de IA a BD",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instancia global del servidor MCP
mcp_server = MCPServer()

# ============= API ENDPOINTS =============

class RegisterModelRequest(BaseModel):
    model_id: str
    access_level: str
    allowed_tables: list[str]
    data_classification: str = "internal"

@app.post("/models/register", tags=["Models"])
async def register_model(request: RegisterModelRequest):
    """Registrar modelo de IA"""
    try:
        context = mcp_server.register_ai_model(
            model_id=request.model_id,
            access_level=AccessLevel(request.access_level),
            allowed_tables=request.allowed_tables,
            data_classification=DataClassification(request.data_classification)
        )
        return {"success": True, "context": mcp_server.get_context_info(request.model_id)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class ExecuteQueryRequest(BaseModel):
    model_id: str
    table: str
    filters: dict = {}
    limit: int = 100
    offset: int = 0

@app.post("/query/execute", tags=["Queries"])
async def execute_query(request: ExecuteQueryRequest):
    """Ejecutar consulta segura"""
    try:
        query_request = QueryRequest(
            query=f"SELECT * FROM {request.table}",
            table=request.table,
            filters=request.filters,
            limit=request.limit,
            offset=request.offset
        )
        
        response = mcp_server.execute_query(request.model_id, query_request)
        
        return {
            "success": response.success,
            "data": response.data,
            "error": response.error,
            "metadata": response.metadata
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/models/{model_id}", tags=["Models"])
async def get_model_info(model_id: str):
    """Obtener información del modelo"""
    info = mcp_server.get_context_info(model_id)
    if "error" in info:
        raise HTTPException(status_code=404, detail=info["error"])
    return info

@app.get("/audit-log", tags=["Audit"])
async def get_audit_log(limit: int = 100):
    """Obtener log de auditoría"""
    return {"logs": mcp_server.get_audit_log(limit)}

@app.get("/query-log", tags=["Queries"])
async def get_query_log(model_id: Optional[str] = None, limit: int = 100):
    """Obtener log de consultas"""
    return {"logs": mcp_server.get_query_log(model_id, limit)}

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check"""
    return {
        "status": "healthy",
        "service": "MCP Server",
        "timestamp": datetime.now().isoformat(),
        "registered_models": len(mcp_server.contexts),
        "total_queries": len(mcp_server.query_log)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)
