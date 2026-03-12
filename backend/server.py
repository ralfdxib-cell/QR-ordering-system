from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import jwt
import bcrypt
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'restaurant-qr-secret-key-2024')
JWT_ALGORITHM = "HS256"

# Create the main app
app = FastAPI(title="Restaurant QR Ordering System")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer(auto_error=False)

# ============ MODELS ============

# Restaurant Settings
class RestaurantSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Mijn Restaurant"
    logo_url: Optional[str] = None
    primary_color: str = "#5A6B5D"
    secondary_color: str = "#E8E6E1"
    currency: str = "EUR"
    currency_symbol: str = "€"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RestaurantSettingsUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    currency: Optional[str] = None
    currency_symbol: Optional[str] = None

# Admin User
class AdminUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password_hash: str
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminLogin(BaseModel):
    email: str
    password: str

class AdminRegister(BaseModel):
    email: str
    password: str
    name: str

class AdminResponse(BaseModel):
    id: str
    email: str
    name: str

# Category
class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    sort_order: int = 0

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None

# Modifier Group
class ModifierOption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: float = 0

class ModifierGroup(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    required: bool = False
    max_selections: int = 1
    options: List[ModifierOption] = []

# Menu Item
class MenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category_id: str
    name: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    dietary_tags: List[str] = []
    modifier_groups: List[ModifierGroup] = []
    is_available: bool = True
    sort_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuItemCreate(BaseModel):
    category_id: str
    name: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    dietary_tags: List[str] = []
    modifier_groups: List[ModifierGroup] = []
    sort_order: int = 0

class MenuItemUpdate(BaseModel):
    category_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    dietary_tags: Optional[List[str]] = None
    modifier_groups: Optional[List[ModifierGroup]] = None
    is_available: Optional[bool] = None
    sort_order: Optional[int] = None

# Table
class Table(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    table_number: str
    qr_code: str = Field(default_factory=lambda: str(uuid.uuid4()))
    capacity: int = 4
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TableCreate(BaseModel):
    table_number: str
    capacity: int = 4

class TableUpdate(BaseModel):
    table_number: Optional[str] = None
    capacity: Optional[int] = None
    is_active: Optional[bool] = None

# Order
class OrderItem(BaseModel):
    menu_item_id: str
    menu_item_name: str
    quantity: int
    unit_price: float
    modifiers: List[dict] = []
    special_instructions: Optional[str] = None
    subtotal: float

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    table_id: str
    table_number: str
    items: List[OrderItem]
    total: float
    status: str = "new"  # new, preparing, ready, served, cancelled
    customer_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    table_id: str
    items: List[OrderItem]
    customer_name: Optional[str] = None
    notes: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: str

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7  # 7 days
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ ROUTES ============

# Health check
@api_router.get("/")
async def root():
    return {"message": "Restaurant QR Ordering API", "status": "healthy"}

# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=dict)
async def register_admin(data: AdminRegister):
    existing = await db.admins.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    admin = AdminUser(
        email=data.email,
        password_hash=hash_password(data.password),
        name=data.name
    )
    doc = admin.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.admins.insert_one(doc)
    
    token = create_token(admin.id, admin.email)
    return {"token": token, "admin": {"id": admin.id, "email": admin.email, "name": admin.name}}

@api_router.post("/auth/login", response_model=dict)
async def login_admin(data: AdminLogin):
    admin = await db.admins.find_one({"email": data.email}, {"_id": 0})
    if not admin or not verify_password(data.password, admin['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(admin['id'], admin['email'])
    return {"token": token, "admin": {"id": admin['id'], "email": admin['email'], "name": admin['name']}}

@api_router.get("/auth/me", response_model=AdminResponse)
async def get_current_user(current_admin: dict = Depends(get_current_admin)):
    admin = await db.admins.find_one({"id": current_admin['user_id']}, {"_id": 0, "password_hash": 0})
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    return admin

# ============ RESTAURANT SETTINGS ROUTES ============

@api_router.get("/settings", response_model=RestaurantSettings)
async def get_settings():
    settings = await db.settings.find_one({}, {"_id": 0})
    if not settings:
        default_settings = RestaurantSettings()
        doc = default_settings.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.settings.insert_one(doc)
        return default_settings
    if isinstance(settings.get('created_at'), str):
        settings['created_at'] = datetime.fromisoformat(settings['created_at'])
    if isinstance(settings.get('updated_at'), str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])
    return settings

@api_router.put("/settings", response_model=RestaurantSettings)
async def update_settings(data: RestaurantSettingsUpdate, _: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.settings.update_one({}, {"$set": update_data}, upsert=True)
    return await get_settings()

# ============ FILE UPLOAD ============

@api_router.post("/upload/logo")
async def upload_logo(file: UploadFile = File(...), _: dict = Depends(get_current_admin)):
    """Upload a logo image file"""
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Ongeldig bestandstype. Gebruik JPG, PNG, GIF, WebP of SVG.")
    
    # Generate unique filename
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'
    unique_filename = f"logo_{uuid.uuid4().hex[:8]}.{file_ext}"
    file_path = UPLOADS_DIR / unique_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bestand opslaan mislukt: {str(e)}")
    
    # Return the URL path
    logo_url = f"/uploads/{unique_filename}"
    
    return {"logo_url": logo_url, "filename": unique_filename}

@api_router.post("/upload/image")
async def upload_image(file: UploadFile = File(...), _: dict = Depends(get_current_admin)):
    """Upload a general image file (for menu items, categories)"""
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Ongeldig bestandstype. Gebruik JPG, PNG, GIF of WebP.")
    
    # Generate unique filename
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'
    unique_filename = f"img_{uuid.uuid4().hex[:8]}.{file_ext}"
    file_path = UPLOADS_DIR / unique_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bestand opslaan mislukt: {str(e)}")
    
    # Return the URL path
    image_url = f"/uploads/{unique_filename}"
    
    return {"image_url": image_url, "filename": unique_filename}

# ============ CATEGORY ROUTES ============

@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find({"is_active": True}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    for cat in categories:
        if isinstance(cat.get('created_at'), str):
            cat['created_at'] = datetime.fromisoformat(cat['created_at'])
    return categories

@api_router.get("/categories/all", response_model=List[Category])
async def get_all_categories(_: dict = Depends(get_current_admin)):
    categories = await db.categories.find({}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    for cat in categories:
        if isinstance(cat.get('created_at'), str):
            cat['created_at'] = datetime.fromisoformat(cat['created_at'])
    return categories

@api_router.post("/categories", response_model=Category)
async def create_category(data: CategoryCreate, _: dict = Depends(get_current_admin)):
    category = Category(**data.model_dump())
    doc = category.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.categories.insert_one(doc)
    return category

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, data: CategoryUpdate, _: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    result = await db.categories.update_one({"id": category_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if isinstance(category.get('created_at'), str):
        category['created_at'] = datetime.fromisoformat(category['created_at'])
    return category

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, _: dict = Depends(get_current_admin)):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    await db.menu_items.delete_many({"category_id": category_id})
    return {"message": "Category deleted"}

# ============ MENU ITEM ROUTES ============

@api_router.get("/menu-items", response_model=List[MenuItem])
async def get_menu_items(category_id: Optional[str] = None):
    query = {"is_available": True}
    if category_id:
        query["category_id"] = category_id
    items = await db.menu_items.find(query, {"_id": 0}).sort("sort_order", 1).to_list(500)
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    return items

@api_router.get("/menu-items/all", response_model=List[MenuItem])
async def get_all_menu_items(_: dict = Depends(get_current_admin)):
    items = await db.menu_items.find({}, {"_id": 0}).sort("sort_order", 1).to_list(500)
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    return items

@api_router.get("/menu-items/{item_id}", response_model=MenuItem)
async def get_menu_item(item_id: str):
    item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    if isinstance(item.get('created_at'), str):
        item['created_at'] = datetime.fromisoformat(item['created_at'])
    return item

@api_router.post("/menu-items", response_model=MenuItem)
async def create_menu_item(data: MenuItemCreate, _: dict = Depends(get_current_admin)):
    item = MenuItem(**data.model_dump())
    doc = item.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.menu_items.insert_one(doc)
    return item

@api_router.put("/menu-items/{item_id}", response_model=MenuItem)
async def update_menu_item(item_id: str, data: MenuItemUpdate, _: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    result = await db.menu_items.update_one({"id": item_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if isinstance(item.get('created_at'), str):
        item['created_at'] = datetime.fromisoformat(item['created_at'])
    return item

@api_router.delete("/menu-items/{item_id}")
async def delete_menu_item(item_id: str, _: dict = Depends(get_current_admin)):
    result = await db.menu_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Menu item deleted"}

# ============ TABLE ROUTES ============

@api_router.get("/tables", response_model=List[Table])
async def get_tables():
    tables = await db.tables.find({"is_active": True}, {"_id": 0}).sort("table_number", 1).to_list(100)
    for table in tables:
        if isinstance(table.get('created_at'), str):
            table['created_at'] = datetime.fromisoformat(table['created_at'])
    return tables

@api_router.get("/tables/all", response_model=List[Table])
async def get_all_tables(_: dict = Depends(get_current_admin)):
    tables = await db.tables.find({}, {"_id": 0}).sort("table_number", 1).to_list(100)
    for table in tables:
        if isinstance(table.get('created_at'), str):
            table['created_at'] = datetime.fromisoformat(table['created_at'])
    return tables

@api_router.get("/tables/qr/{qr_code}", response_model=Table)
async def get_table_by_qr(qr_code: str):
    table = await db.tables.find_one({"qr_code": qr_code, "is_active": True}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    if isinstance(table.get('created_at'), str):
        table['created_at'] = datetime.fromisoformat(table['created_at'])
    return table

@api_router.post("/tables", response_model=Table)
async def create_table(data: TableCreate, _: dict = Depends(get_current_admin)):
    table = Table(**data.model_dump())
    doc = table.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.tables.insert_one(doc)
    return table

@api_router.put("/tables/{table_id}", response_model=Table)
async def update_table(table_id: str, data: TableUpdate, _: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    result = await db.tables.update_one({"id": table_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Table not found")
    table = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if isinstance(table.get('created_at'), str):
        table['created_at'] = datetime.fromisoformat(table['created_at'])
    return table

@api_router.delete("/tables/{table_id}")
async def delete_table(table_id: str, _: dict = Depends(get_current_admin)):
    result = await db.tables.delete_one({"id": table_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Table not found")
    return {"message": "Table deleted"}

@api_router.post("/tables/{table_id}/regenerate-qr", response_model=Table)
async def regenerate_qr(table_id: str, _: dict = Depends(get_current_admin)):
    new_qr = str(uuid.uuid4())
    result = await db.tables.update_one({"id": table_id}, {"$set": {"qr_code": new_qr}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Table not found")
    table = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if isinstance(table.get('created_at'), str):
        table['created_at'] = datetime.fromisoformat(table['created_at'])
    return table

# ============ ORDER ROUTES ============

@api_router.get("/orders", response_model=List[Order])
async def get_orders(status: Optional[str] = None, table_id: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    if table_id:
        query["table_id"] = table_id
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if isinstance(order.get('updated_at'), str):
            order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    return orders

@api_router.get("/orders/active", response_model=List[Order])
async def get_active_orders():
    orders = await db.orders.find(
        {"status": {"$in": ["new", "preparing", "ready"]}},
        {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if isinstance(order.get('updated_at'), str):
            order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    return orders

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if isinstance(order.get('created_at'), str):
        order['created_at'] = datetime.fromisoformat(order['created_at'])
    if isinstance(order.get('updated_at'), str):
        order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    return order

@api_router.post("/orders", response_model=Order)
async def create_order(data: OrderCreate):
    # Get table info
    table = await db.tables.find_one({"id": data.table_id}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    # Calculate total
    total = sum(item.subtotal for item in data.items)
    
    order = Order(
        table_id=data.table_id,
        table_number=table['table_number'],
        items=[item.model_dump() for item in data.items],
        total=total,
        customer_name=data.customer_name,
        notes=data.notes
    )
    
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.orders.insert_one(doc)
    
    return order

@api_router.put("/orders/{order_id}/status", response_model=Order)
async def update_order_status(order_id: str, data: OrderStatusUpdate):
    valid_statuses = ["new", "preparing", "ready", "served", "cancelled"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    update_data = {
        "status": data.status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.orders.update_one({"id": order_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if isinstance(order.get('created_at'), str):
        order['created_at'] = datetime.fromisoformat(order['created_at'])
    if isinstance(order.get('updated_at'), str):
        order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    return order

# ============ SEED DATA ============

@api_router.post("/seed")
async def seed_data():
    """Seed sample data for demo purposes"""
    # Check if data already exists
    existing_categories = await db.categories.count_documents({})
    if existing_categories > 0:
        return {"message": "Data already seeded"}
    
    # Create sample categories
    categories = [
        {"id": str(uuid.uuid4()), "name": "Starters", "description": "Appetizers and small plates", "image_url": "https://images.unsplash.com/photo-1541014741259-de529411b96a?w=400", "sort_order": 1, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Main Course", "description": "Hearty main dishes", "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400", "sort_order": 2, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Burgers", "description": "Handcrafted gourmet burgers", "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400", "sort_order": 3, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Pizza", "description": "Wood-fired artisan pizzas", "image_url": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400", "sort_order": 4, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Beverages", "description": "Refreshing drinks", "image_url": "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400", "sort_order": 5, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Desserts", "description": "Sweet endings", "image_url": "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400", "sort_order": 6, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    
    await db.categories.insert_many(categories)
    
    # Create sample menu items
    menu_items = [
        # Starters
        {"id": str(uuid.uuid4()), "category_id": categories[0]["id"], "name": "Crispy Calamari", "description": "Lightly battered squid rings with aioli", "price": 12.99, "image_url": "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400", "dietary_tags": ["seafood"], "modifier_groups": [], "is_available": True, "sort_order": 1, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "category_id": categories[0]["id"], "name": "Bruschetta", "description": "Toasted bread with fresh tomatoes and basil", "price": 8.99, "image_url": "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400", "dietary_tags": ["vegetarian", "vegan"], "modifier_groups": [], "is_available": True, "sort_order": 2, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "category_id": categories[0]["id"], "name": "Chicken Wings", "description": "Crispy wings with your choice of sauce", "price": 14.99, "image_url": "https://images.unsplash.com/photo-1608039829572-9b0b2246d12f?w=400", "dietary_tags": [], "modifier_groups": [{"id": str(uuid.uuid4()), "name": "Sauce", "required": True, "max_selections": 1, "options": [{"id": str(uuid.uuid4()), "name": "Buffalo", "price": 0}, {"id": str(uuid.uuid4()), "name": "BBQ", "price": 0}, {"id": str(uuid.uuid4()), "name": "Honey Garlic", "price": 0}]}], "is_available": True, "sort_order": 3, "created_at": datetime.now(timezone.utc).isoformat()},
        
        # Main Course
        {"id": str(uuid.uuid4()), "category_id": categories[1]["id"], "name": "Grilled Salmon", "description": "Atlantic salmon with lemon butter sauce", "price": 24.99, "image_url": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400", "dietary_tags": ["seafood", "gluten-free"], "modifier_groups": [{"id": str(uuid.uuid4()), "name": "Side", "required": True, "max_selections": 1, "options": [{"id": str(uuid.uuid4()), "name": "Mashed Potatoes", "price": 0}, {"id": str(uuid.uuid4()), "name": "Steamed Vegetables", "price": 0}, {"id": str(uuid.uuid4()), "name": "Garden Salad", "price": 0}]}], "is_available": True, "sort_order": 1, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "category_id": categories[1]["id"], "name": "Ribeye Steak", "description": "12oz prime ribeye cooked to perfection", "price": 34.99, "image_url": "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400", "dietary_tags": ["gluten-free"], "modifier_groups": [{"id": str(uuid.uuid4()), "name": "Doneness", "required": True, "max_selections": 1, "options": [{"id": str(uuid.uuid4()), "name": "Rare", "price": 0}, {"id": str(uuid.uuid4()), "name": "Medium Rare", "price": 0}, {"id": str(uuid.uuid4()), "name": "Medium", "price": 0}, {"id": str(uuid.uuid4()), "name": "Well Done", "price": 0}]}], "is_available": True, "sort_order": 2, "created_at": datetime.now(timezone.utc).isoformat()},
        
        # Burgers
        {"id": str(uuid.uuid4()), "category_id": categories[2]["id"], "name": "Classic Cheeseburger", "description": "Angus beef patty with cheddar and special sauce", "price": 16.99, "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400", "dietary_tags": [], "modifier_groups": [{"id": str(uuid.uuid4()), "name": "Add-ons", "required": False, "max_selections": 3, "options": [{"id": str(uuid.uuid4()), "name": "Bacon", "price": 2.5}, {"id": str(uuid.uuid4()), "name": "Extra Cheese", "price": 1.5}, {"id": str(uuid.uuid4()), "name": "Avocado", "price": 2.0}]}], "is_available": True, "sort_order": 1, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "category_id": categories[2]["id"], "name": "Mushroom Swiss Burger", "description": "Topped with sautéed mushrooms and Swiss cheese", "price": 18.99, "image_url": "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400", "dietary_tags": [], "modifier_groups": [], "is_available": True, "sort_order": 2, "created_at": datetime.now(timezone.utc).isoformat()},
        
        # Pizza
        {"id": str(uuid.uuid4()), "category_id": categories[3]["id"], "name": "Margherita", "description": "Fresh mozzarella, tomato, and basil", "price": 14.99, "image_url": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400", "dietary_tags": ["vegetarian"], "modifier_groups": [{"id": str(uuid.uuid4()), "name": "Size", "required": True, "max_selections": 1, "options": [{"id": str(uuid.uuid4()), "name": "Medium (12\")", "price": 0}, {"id": str(uuid.uuid4()), "name": "Large (16\")", "price": 4}]}], "is_available": True, "sort_order": 1, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "category_id": categories[3]["id"], "name": "Pepperoni Supreme", "description": "Loaded with pepperoni and mozzarella", "price": 17.99, "image_url": "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400", "dietary_tags": [], "modifier_groups": [{"id": str(uuid.uuid4()), "name": "Size", "required": True, "max_selections": 1, "options": [{"id": str(uuid.uuid4()), "name": "Medium (12\")", "price": 0}, {"id": str(uuid.uuid4()), "name": "Large (16\")", "price": 4}]}], "is_available": True, "sort_order": 2, "created_at": datetime.now(timezone.utc).isoformat()},
        
        # Beverages
        {"id": str(uuid.uuid4()), "category_id": categories[4]["id"], "name": "Fresh Lemonade", "description": "House-made with fresh lemons", "price": 4.99, "image_url": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400", "dietary_tags": ["vegan", "gluten-free"], "modifier_groups": [], "is_available": True, "sort_order": 1, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "category_id": categories[4]["id"], "name": "Iced Coffee", "description": "Cold brew served over ice", "price": 5.99, "image_url": "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400", "dietary_tags": ["vegan"], "modifier_groups": [{"id": str(uuid.uuid4()), "name": "Milk", "required": False, "max_selections": 1, "options": [{"id": str(uuid.uuid4()), "name": "Whole Milk", "price": 0}, {"id": str(uuid.uuid4()), "name": "Oat Milk", "price": 0.5}, {"id": str(uuid.uuid4()), "name": "Almond Milk", "price": 0.5}]}], "is_available": True, "sort_order": 2, "created_at": datetime.now(timezone.utc).isoformat()},
        
        # Desserts
        {"id": str(uuid.uuid4()), "category_id": categories[5]["id"], "name": "Chocolate Lava Cake", "description": "Warm cake with molten chocolate center", "price": 9.99, "image_url": "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400", "dietary_tags": ["vegetarian"], "modifier_groups": [], "is_available": True, "sort_order": 1, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "category_id": categories[5]["id"], "name": "New York Cheesecake", "description": "Creamy cheesecake with berry compote", "price": 8.99, "image_url": "https://images.unsplash.com/photo-1524351199678-941a58a3df50?w=400", "dietary_tags": ["vegetarian"], "modifier_groups": [], "is_available": True, "sort_order": 2, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    
    await db.menu_items.insert_many(menu_items)
    
    # Create sample tables
    tables = [
        {"id": str(uuid.uuid4()), "table_number": "1", "qr_code": str(uuid.uuid4()), "capacity": 2, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "table_number": "2", "qr_code": str(uuid.uuid4()), "capacity": 4, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "table_number": "3", "qr_code": str(uuid.uuid4()), "capacity": 4, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "table_number": "4", "qr_code": str(uuid.uuid4()), "capacity": 6, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "table_number": "5", "qr_code": str(uuid.uuid4()), "capacity": 8, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    
    await db.tables.insert_many(tables)
    
    return {"message": "Sample data seeded successfully", "categories": len(categories), "menu_items": len(menu_items), "tables": len(tables)}

# Include the router in the main app
app.include_router(api_router)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
