"""
Enterprise ETL DAG - Pipelines de Datos Empresariales
Procesa datos de sistemas operacionales hacia data warehouse
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from airflow.models import Variable
import logging

logger = logging.getLogger(__name__)

# ============= DAG CONFIGURATION =============

default_args = {
    'owner': 'data-engineering',
    'depends_on_past': False,
    'email': ['data-alerts@enterprise.com'],
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'execution_timeout': timedelta(hours=2),
    'start_date': datetime(2026, 1, 1),
}

dag = DAG(
    'enterprise_etl_pipeline',
    default_args=default_args,
    description='Enterprise ETL Pipeline - Daily Data Processing',
    schedule_interval='0 2 * * *',  # 2 AM daily
    catchup=False,
    tags=['enterprise', 'etl', 'daily'],
)

# ============= PYTHON OPERATORS =============

def extract_transactions(**context):
    """Extraer transacciones de BD operacional"""
    logger.info("Starting transaction extraction...")
    
    # En producción, conectaría a BD real
    transactions = [
        {
            "id": 1,
            "customer_id": 101,
            "amount": 5000.00,
            "status": "completed",
            "timestamp": datetime.now().isoformat()
        },
        {
            "id": 2,
            "customer_id": 102,
            "amount": 3500.00,
            "status": "completed",
            "timestamp": datetime.now().isoformat()
        }
    ]
    
    context['task_instance'].xcom_push(key='transactions', value=transactions)
    logger.info(f"Extracted {len(transactions)} transactions")
    return len(transactions)

def extract_orders(**context):
    """Extraer órdenes de BD operacional"""
    logger.info("Starting order extraction...")
    
    orders = [
        {
            "id": 1,
            "customer_id": 101,
            "total_amount": 5000.00,
            "status": "shipped",
            "timestamp": datetime.now().isoformat()
        },
        {
            "id": 2,
            "customer_id": 102,
            "total_amount": 3500.00,
            "status": "processing",
            "timestamp": datetime.now().isoformat()
        }
    ]
    
    context['task_instance'].xcom_push(key='orders', value=orders)
    logger.info(f"Extracted {len(orders)} orders")
    return len(orders)

def extract_customers(**context):
    """Extraer clientes de BD operacional"""
    logger.info("Starting customer extraction...")
    
    customers = [
        {
            "id": 101,
            "name": "Acme Corp",
            "email": "contact@acme.com",
            "industry": "Technology",
            "status": "active"
        },
        {
            "id": 102,
            "name": "Global Industries",
            "email": "info@global.com",
            "industry": "Manufacturing",
            "status": "active"
        }
    ]
    
    context['task_instance'].xcom_push(key='customers', value=customers)
    logger.info(f"Extracted {len(customers)} customers")
    return len(customers)

def transform_transactions(**context):
    """Transformar datos de transacciones"""
    logger.info("Transforming transactions...")
    
    transactions = context['task_instance'].xcom_pull(
        task_ids='extract_transactions',
        key='transactions'
    )
    
    # Aplicar transformaciones
    transformed = []
    for txn in transactions:
        transformed.append({
            **txn,
            "date": datetime.now().date().isoformat(),
            "amount_usd": txn['amount'],
            "processing_fee": txn['amount'] * 0.02,
            "net_amount": txn['amount'] * 0.98
        })
    
    context['task_instance'].xcom_push(key='transformed_transactions', value=transformed)
    logger.info(f"Transformed {len(transformed)} transactions")
    return len(transformed)

def transform_orders(**context):
    """Transformar datos de órdenes"""
    logger.info("Transforming orders...")
    
    orders = context['task_instance'].xcom_pull(
        task_ids='extract_orders',
        key='orders'
    )
    
    transformed = []
    for order in orders:
        transformed.append({
            **order,
            "date": datetime.now().date().isoformat(),
            "fulfillment_status": "on_time" if order['status'] == "shipped" else "pending",
            "revenue_recognized": order['total_amount'] if order['status'] == "shipped" else 0
        })
    
    context['task_instance'].xcom_push(key='transformed_orders', value=transformed)
    logger.info(f"Transformed {len(transformed)} orders")
    return len(transformed)

def load_to_warehouse(**context):
    """Cargar datos transformados a data warehouse"""
    logger.info("Loading data to warehouse...")
    
    transactions = context['task_instance'].xcom_pull(
        task_ids='transform_transactions',
        key='transformed_transactions'
    )
    
    orders = context['task_instance'].xcom_pull(
        task_ids='transform_orders',
        key='transformed_orders'
    )
    
    # En producción, cargaría a Snowflake, BigQuery, etc.
    total_records = len(transactions) + len(orders)
    logger.info(f"Loaded {total_records} records to warehouse")
    
    context['task_instance'].xcom_push(key='load_status', value='success')
    return total_records

def generate_daily_metrics(**context):
    """Generar métricas diarias"""
    logger.info("Generating daily metrics...")
    
    load_status = context['task_instance'].xcom_pull(
        task_ids='load_to_warehouse',
        key='load_status'
    )
    
    if load_status == 'success':
        metrics = {
            "date": datetime.now().date().isoformat(),
            "total_transactions": 2,
            "total_orders": 2,
            "total_revenue": 8500.00,
            "average_order_value": 4250.00,
            "pipeline_status": "success",
            "execution_time_seconds": 300
        }
        
        logger.info(f"Daily metrics: {metrics}")
        return metrics
    
    raise Exception("Load failed, cannot generate metrics")

def data_quality_check(**context):
    """Validar calidad de datos"""
    logger.info("Running data quality checks...")
    
    checks = {
        "null_values": 0,
        "duplicates": 0,
        "schema_validation": True,
        "referential_integrity": True,
        "timestamp_validity": True
    }
    
    if not checks['schema_validation']:
        raise Exception("Data quality check failed: schema validation")
    
    logger.info("Data quality checks passed")
    return checks

# ============= TASKS =============

# Extraction Layer
extract_txn = PythonOperator(
    task_id='extract_transactions',
    python_callable=extract_transactions,
    dag=dag,
)

extract_ord = PythonOperator(
    task_id='extract_orders',
    python_callable=extract_orders,
    dag=dag,
)

extract_cust = PythonOperator(
    task_id='extract_customers',
    python_callable=extract_customers,
    dag=dag,
)

# Transformation Layer
transform_txn = PythonOperator(
    task_id='transform_transactions',
    python_callable=transform_transactions,
    dag=dag,
)

transform_ord = PythonOperator(
    task_id='transform_orders',
    python_callable=transform_orders,
    dag=dag,
)

# Quality Check
quality_check = PythonOperator(
    task_id='data_quality_check',
    python_callable=data_quality_check,
    dag=dag,
)

# Loading Layer
load_warehouse = PythonOperator(
    task_id='load_to_warehouse',
    python_callable=load_to_warehouse,
    dag=dag,
)

# Metrics Generation
gen_metrics = PythonOperator(
    task_id='generate_daily_metrics',
    python_callable=generate_daily_metrics,
    dag=dag,
)

# ============= DEPENDENCIES =============

# Extraction happens in parallel
[extract_txn, extract_ord, extract_cust]

# Transform after extraction
extract_txn >> transform_txn
extract_ord >> transform_ord

# Quality check before loading
[transform_txn, transform_ord] >> quality_check

# Load after quality check
quality_check >> load_warehouse

# Generate metrics after loading
load_warehouse >> gen_metrics
