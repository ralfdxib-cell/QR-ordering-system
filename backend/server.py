from fastapi import FastAPI, APIRouter, HTTPException, Depends, status as http_status, UploadFile, File, Request
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
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import shutil
import re

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

# Platform admin secret (for super admin access)
PLATFORM_ADMIN_SECRET = os.environ.get('PLATFORM_ADMIN_SECRET', 'super-admin-secret-2024')

# Platform admin credentials (auto-created on startup)
PLATFORM_ADMIN_EMAIL = os.environ.get('PLATFORM_ADMIN_EMAIL', 'superadmin@platform.com')
PLATFORM_ADMIN_PASSWORD = os.environ.get('PLATFORM_ADMIN_PASSWORD', 'Admin1234!')
PLATFORM_ADMIN_NAME = os.environ.get('PLATFORM_ADMIN_NAME', 'Super Admin')

# Create the main app
app = FastAPI(title="Restaurant QR Ordering System - Multi-Tenant SaaS")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer(auto_error=False)

# ============ MODELS ============

# ============ TENANT (RESTAURANT) MODEL ============
class SubscriptionPlan(BaseModel):
    name: str = "trial"  # trial, basic, pro, enterprise
    max_tables: int = 5
    max_menu_items: int = 50
    max_orders_per_month: int = 500
    features: List[str] = []

class Tenant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str  # URL-friendly unique identifier (e.g., "pizzeria-roma")
    name: str
    email: str  # Primary contact email
    phone: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: str = "#5A6B5D"
    secondary_color: str = "#E8E6E1"
    currency: str = "EUR"
    currency_symbol: str = "€"
    # Subscription
    subscription_status: str = "trial"  # trial, active, cancelled, suspended
    subscription_plan: str = "trial"
    trial_ends_at: Optional[datetime] = None
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    # Stats
    orders_this_month: int = 0
    last_order_reset: Optional[datetime] = None
    # Status
    is_active: bool = True
    is_onboarded: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TenantCreate(BaseModel):
    name: str
    slug: str
    email: str
    password: str  # For admin user
    phone: Optional[str] = None

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    currency: Optional[str] = None
    currency_symbol: Optional[str] = None
    is_onboarded: Optional[bool] = None

class TenantResponse(BaseModel):
    id: str
    slug: str
    name: str
    email: str
    logo_url: Optional[str] = None
    primary_color: str
    secondary_color: str
    currency: str
    currency_symbol: str
    subscription_status: str
    subscription_plan: str
    trial_ends_at: Optional[datetime] = None
    is_active: bool
    is_onboarded: bool

# Restaurant Settings (deprecated - keeping for backwards compatibility)
class RestaurantSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: Optional[str] = None  # Link to tenant
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
    tenant_id: str  # Link to tenant
    email: str
    password_hash: str
    name: str
    role: str = "admin"  # admin, staff, kitchen
    is_platform_admin: bool = False  # Super admin for platform management
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminLogin(BaseModel):
    email: str
    password: str

class AdminRegister(BaseModel):
    email: str
    password: str
    name: str
    tenant_id: Optional[str] = None  # Optional for platform admin

class AdminResponse(BaseModel):
    id: str
    email: str
    name: str
    tenant_id: Optional[str] = None
    role: str = "admin"
    is_platform_admin: bool = False

# Category
class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str  # Link to tenant
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
    tenant_id: str  # Link to tenant
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
    tenant_id: str  # Link to tenant
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
    tenant_id: str  # Link to tenant
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

def create_token(user_id: str, email: str, tenant_id: str = None, is_platform_admin: bool = False) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "tenant_id": tenant_id,
        "is_platform_admin": is_platform_admin,
        "exp": datetime.now(timezone.utc).timestamp() + 1800  # 30 minutes
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def slugify(text: str) -> str:
    """Convert text to URL-friendly slug"""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text

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

async def get_platform_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify user is a platform admin"""
    payload = await get_current_admin(credentials)
    if not payload.get('is_platform_admin'):
        raise HTTPException(status_code=403, detail="Platform admin access required")
    return payload

async def get_tenant_from_slug(slug: str) -> dict:
    """Get tenant by slug"""
    tenant = await db.tenants.find_one({"slug": slug, "is_active": True}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Restaurant niet gevonden")
    if tenant.get('subscription_status') == 'suspended':
        raise HTTPException(status_code=403, detail="Dit restaurant is tijdelijk niet beschikbaar.")
    return tenant

async def verify_tenant_access(current_admin: dict, tenant_id: str):
    """Verify admin has access to tenant"""
    if current_admin.get('is_platform_admin'):
        return True
    if current_admin.get('tenant_id') != tenant_id:
        raise HTTPException(status_code=403, detail="Access denied to this restaurant")
    return True

# ============ ROUTES ============

# Health check
@api_router.get("/")
async def root():
    return {"message": "Restaurant QR Ordering API - Multi-Tenant SaaS", "status": "healthy"}

# ============ TENANT ROUTES ============

@api_router.post("/tenants/register", response_model=dict)
async def register_tenant(data: TenantCreate):
    """Register a new restaurant (tenant)"""
    # Validate slug
    slug = slugify(data.slug)
    if len(slug) < 3:
        raise HTTPException(status_code=400, detail="Slug moet minimaal 3 karakters zijn")
    
    # Check if slug already exists
    existing = await db.tenants.find_one({"slug": slug}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Deze restaurant URL is al in gebruik")
    
    # Check if email already exists
    existing_email = await db.admins.find_one({"email": data.email}, {"_id": 0})
    if existing_email:
        raise HTTPException(status_code=400, detail="Dit email adres is al geregistreerd")
    
    # Create tenant with 14-day trial
    trial_end = datetime.now(timezone.utc) + timedelta(days=14)
    tenant = Tenant(
        slug=slug,
        name=data.name,
        email=data.email,
        phone=data.phone,
        trial_ends_at=trial_end,
        last_order_reset=datetime.now(timezone.utc)
    )
    
    tenant_doc = tenant.model_dump()
    tenant_doc['created_at'] = tenant_doc['created_at'].isoformat()
    tenant_doc['updated_at'] = tenant_doc['updated_at'].isoformat()
    tenant_doc['trial_ends_at'] = tenant_doc['trial_ends_at'].isoformat() if tenant_doc['trial_ends_at'] else None
    tenant_doc['last_order_reset'] = tenant_doc['last_order_reset'].isoformat() if tenant_doc['last_order_reset'] else None
    await db.tenants.insert_one(tenant_doc)
    
    # Create admin user for tenant
    admin = AdminUser(
        tenant_id=tenant.id,
        email=data.email,
        password_hash=hash_password(data.password),
        name=data.name,
        role="admin"
    )
    admin_doc = admin.model_dump()
    admin_doc['created_at'] = admin_doc['created_at'].isoformat()
    await db.admins.insert_one(admin_doc)
    
    # Generate token
    token = create_token(admin.id, admin.email, tenant.id)
    
    return {
        "token": token,
        "tenant": {
            "id": tenant.id,
            "slug": tenant.slug,
            "name": tenant.name,
            "subscription_status": tenant.subscription_status
        },
        "admin": {
            "id": admin.id,
            "email": admin.email,
            "name": admin.name
        }
    }

@api_router.get("/tenants/{slug}", response_model=TenantResponse)
async def get_tenant_by_slug(slug: str):
    """Get public tenant info by slug"""
    tenant = await get_tenant_from_slug(slug)
    return tenant

@api_router.get("/tenants/{slug}/full", response_model=dict)
async def get_tenant_full(slug: str, current_admin: dict = Depends(get_current_admin)):
    """Get full tenant info (admin only)"""
    tenant = await get_tenant_from_slug(slug)
    await verify_tenant_access(current_admin, tenant['id'])
    return tenant

@api_router.put("/tenants/{slug}", response_model=TenantResponse)
async def update_tenant(slug: str, data: TenantUpdate, current_admin: dict = Depends(get_current_admin)):
    """Update tenant settings"""
    tenant = await get_tenant_from_slug(slug)
    await verify_tenant_access(current_admin, tenant['id'])
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.tenants.update_one({"slug": slug}, {"$set": update_data})
    updated = await db.tenants.find_one({"slug": slug}, {"_id": 0})
    return updated

# ============ PLATFORM ADMIN ROUTES ============

@api_router.get("/platform/tenants", response_model=List[dict])
async def list_all_tenants(current_admin: dict = Depends(get_platform_admin)):
    """List all tenants (platform admin only)"""
    tenants = await db.tenants.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return tenants

@api_router.put("/platform/tenants/{tenant_id}/status", response_model=dict)
async def update_tenant_status(tenant_id: str, status: str, current_admin: dict = Depends(get_platform_admin)):
    """Update tenant status (platform admin only)"""
    valid_statuses = ["trial", "active", "cancelled", "suspended"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be: {valid_statuses}")
    
    result = await db.tenants.update_one(
        {"id": tenant_id},
        {"$set": {"subscription_status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    return {"message": f"Tenant status updated to {status}"}

@api_router.post("/platform/admin/create", response_model=dict)
async def create_platform_admin(data: AdminRegister, secret: str):
    """Create a platform admin (requires secret)"""
    if secret != PLATFORM_ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid platform secret")
    
    existing = await db.admins.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    admin = AdminUser(
        tenant_id="platform",
        email=data.email,
        password_hash=hash_password(data.password),
        name=data.name,
        role="platform_admin",
        is_platform_admin=True
    )
    doc = admin.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.admins.insert_one(doc)
    
    token = create_token(admin.id, admin.email, None, True)
    return {"token": token, "admin": {"id": admin.id, "email": admin.email, "name": admin.name, "is_platform_admin": True}}

# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=dict)
async def register_admin(data: AdminRegister):
    """Register additional admin for existing tenant"""
    existing = await db.admins.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if not data.tenant_id:
        raise HTTPException(status_code=400, detail="tenant_id is required. Use /tenants/register for new restaurants.")
    
    # Verify tenant exists
    tenant = await db.tenants.find_one({"id": data.tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    admin = AdminUser(
        tenant_id=data.tenant_id,
        email=data.email,
        password_hash=hash_password(data.password),
        name=data.name
    )
    doc = admin.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.admins.insert_one(doc)
    
    token = create_token(admin.id, admin.email, data.tenant_id)
    return {"token": token, "admin": {"id": admin.id, "email": admin.email, "name": admin.name, "tenant_id": data.tenant_id}}

@api_router.post("/auth/login", response_model=dict)
async def login_admin(data: AdminLogin):
    admin = await db.admins.find_one({"email": data.email}, {"_id": 0})
    if not admin or not verify_password(data.password, admin['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    tenant_id = admin.get('tenant_id')
    is_platform_admin = admin.get('is_platform_admin', False)
    
    # Get tenant info and check account status
    tenant_info = None
    if tenant_id and tenant_id != "platform":
        tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
        if tenant:
            # Block login for suspended or inactive tenants
            if tenant.get('subscription_status') == 'suspended':
                raise HTTPException(
                    status_code=403,
                    detail="Your account has been suspended. Please contact support."
                )
            if not tenant.get('is_active', True):
                raise HTTPException(
                    status_code=403,
                    detail="Your account is inactive. Please contact support."
                )
            tenant_info = {"id": tenant['id'], "slug": tenant['slug'], "name": tenant['name']}
    
    token = create_token(admin['id'], admin['email'], tenant_id, is_platform_admin)
    return {
        "token": token,
        "admin": {
            "id": admin['id'],
            "email": admin['email'],
            "name": admin['name'],
            "tenant_id": tenant_id,
            "is_platform_admin": is_platform_admin
        },
        "tenant": tenant_info
    }

@api_router.get("/auth/me", response_model=dict)
async def get_current_user(current_admin: dict = Depends(get_current_admin)):
    admin = await db.admins.find_one({"id": current_admin['user_id']}, {"_id": 0, "password_hash": 0})
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    # Get tenant info
    tenant_info = None
    tenant_id = admin.get('tenant_id')
    if tenant_id and tenant_id != "platform":
        tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
        if tenant:
            tenant_info = {"id": tenant['id'], "slug": tenant['slug'], "name": tenant['name']}
    
    return {"admin": admin, "tenant": tenant_info}

# ============ RESTAURANT SETTINGS ROUTES (Tenant-based) ============

@api_router.get("/settings", response_model=dict)
async def get_settings(current_admin: dict = Depends(get_current_admin)):
    """Get settings for current tenant"""
    tenant_id = current_admin.get('tenant_id')
    if not tenant_id or tenant_id == "platform":
        raise HTTPException(status_code=400, detail="No tenant associated with this account")
    
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Return tenant settings in old format for backwards compatibility
    return {
        "id": tenant['id'],
        "name": tenant['name'],
        "logo_url": tenant.get('logo_url'),
        "primary_color": tenant.get('primary_color', '#5A6B5D'),
        "secondary_color": tenant.get('secondary_color', '#E8E6E1'),
        "currency": tenant.get('currency', 'EUR'),
        "currency_symbol": tenant.get('currency_symbol', '€')
    }

@api_router.get("/r/{slug}/settings", response_model=dict)
async def get_public_settings(slug: str):
    """Get public settings for a restaurant (customer facing)"""
    tenant = await get_tenant_from_slug(slug)
    return {
        "id": tenant['id'],
        "name": tenant['name'],
        "logo_url": tenant.get('logo_url'),
        "primary_color": tenant.get('primary_color', '#5A6B5D'),
        "secondary_color": tenant.get('secondary_color', '#E8E6E1'),
        "currency": tenant.get('currency', 'EUR'),
        "currency_symbol": tenant.get('currency_symbol', '€')
    }

@api_router.put("/settings", response_model=dict)
async def update_settings(data: RestaurantSettingsUpdate, current_admin: dict = Depends(get_current_admin)):
    """Update settings for current tenant"""
    tenant_id = current_admin.get('tenant_id')
    if not tenant_id or tenant_id == "platform":
        raise HTTPException(status_code=400, detail="No tenant associated with this account")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.tenants.update_one({"id": tenant_id}, {"$set": update_data})
    return await get_settings(current_admin)

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
    
    # Return the URL path (via /api/ for ingress routing)
    logo_url = f"/api/uploads/{unique_filename}"
    
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
    
    # Return the URL path (via /api/ for ingress routing)
    image_url = f"/api/uploads/{unique_filename}"
    
    return {"image_url": image_url, "filename": unique_filename}

# ============ CATEGORY ROUTES (Tenant-aware) ============

@api_router.get("/r/{slug}/categories", response_model=List[Category])
async def get_public_categories(slug: str):
    """Get categories for public view (customer)"""
    tenant = await get_tenant_from_slug(slug)
    categories = await db.categories.find({"tenant_id": tenant['id'], "is_active": True}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    for cat in categories:
        if isinstance(cat.get('created_at'), str):
            cat['created_at'] = datetime.fromisoformat(cat['created_at'])
    return categories

@api_router.get("/categories", response_model=List[Category])
async def get_categories(current_admin: dict = Depends(get_current_admin)):
    """Get active categories for current tenant"""
    tenant_id = current_admin.get('tenant_id')
    if not tenant_id or tenant_id == "platform":
        raise HTTPException(status_code=400, detail="No tenant associated")
    
    categories = await db.categories.find({"tenant_id": tenant_id, "is_active": True}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    for cat in categories:
        if isinstance(cat.get('created_at'), str):
            cat['created_at'] = datetime.fromisoformat(cat['created_at'])
    return categories

@api_router.get("/categories/all", response_model=List[Category])
async def get_all_categories(current_admin: dict = Depends(get_current_admin)):
    """Get all categories for current tenant (including inactive)"""
    tenant_id = current_admin.get('tenant_id')
    if not tenant_id or tenant_id == "platform":
        raise HTTPException(status_code=400, detail="No tenant associated")
    
    categories = await db.categories.find({"tenant_id": tenant_id}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    for cat in categories:
        if isinstance(cat.get('created_at'), str):
            cat['created_at'] = datetime.fromisoformat(cat['created_at'])
    return categories

@api_router.post("/categories", response_model=Category)
async def create_category(data: CategoryCreate, current_admin: dict = Depends(get_current_admin)):
    tenant_id = current_admin.get('tenant_id')
    if not tenant_id or tenant_id == "platform":
        raise HTTPException(status_code=400, detail="No tenant associated")
    
    category = Category(tenant_id=tenant_id, **data.model_dump())
    doc = category.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.categories.insert_one(doc)
    return category

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, data: CategoryUpdate, current_admin: dict = Depends(get_current_admin)):
    tenant_id = current_admin.get('tenant_id')
    
    # Verify category belongs to tenant
    existing = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    if existing.get('tenant_id') != tenant_id and not current_admin.get('is_platform_admin'):
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.categories.update_one({"id": category_id}, {"$set": update_data})
    category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if isinstance(category.get('created_at'), str):
        category['created_at'] = datetime.fromisoformat(category['created_at'])
    return category

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_admin: dict = Depends(get_current_admin)):
    tenant_id = current_admin.get('tenant_id')
    
    # Verify category belongs to tenant
    existing = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    if existing.get('tenant_id') != tenant_id and not current_admin.get('is_platform_admin'):
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.categories.delete_one({"id": category_id})
    await db.menu_items.delete_many({"category_id": category_id})
    return {"message": "Category deleted"}

# ============ MENU ITEM ROUTES (Tenant-aware) ============

@api_router.get("/r/{slug}/menu-items", response_model=List[MenuItem])
async def get_public_menu_items(slug: str, category_id: Optional[str] = None):
    """Get menu items for public view (customer)"""
    tenant = await get_tenant_from_slug(slug)
    query = {"tenant_id": tenant['id'], "is_available": True}
    if category_id:
        query["category_id"] = category_id
    items = await db.menu_items.find(query, {"_id": 0}).sort("sort_order", 1).to_list(500)
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    return items

@api_router.get("/menu-items", response_model=List[MenuItem])
async def get_menu_items(category_id: Optional[str] = None, current_admin: dict = Depends(get_current_admin)):
    tenant_id = current_admin.get('tenant_id')
    if not tenant_id or tenant_id == "platform":
        raise HTTPException(status_code=400, detail="No tenant associated")
    
    query = {"tenant_id": tenant_id, "is_available": True}
    if category_id:
        query["category_id"] = category_id
    items = await db.menu_items.find(query, {"_id": 0}).sort("sort_order", 1).to_list(500)
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    return items

@api_router.get("/menu-items/all", response_model=List[MenuItem])
async def get_all_menu_items(current_admin: dict = Depends(get_current_admin)):
    tenant_id = current_admin.get('tenant_id')
    if not tenant_id or tenant_id == "platform":
        raise HTTPException(status_code=400, detail="No tenant associated")
    
    items = await db.menu_items.find({"tenant_id": tenant_id}, {"_id": 0}).sort("sort_order", 1).to_list(500)
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
async def create_menu_item(data: MenuItemCreate, current_admin: dict = Depends(get_current_admin)):
    tenant_id = current_admin.get('tenant_id')
    if not tenant_id or tenant_id == "platform":
        raise HTTPException(status_code=400, detail="No tenant associated")
    
    item = MenuItem(tenant_id=tenant_id, **data.model_dump())
    doc = item.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.menu_items.insert_one(doc)
    return item

@api_router.put("/menu-items/{item_id}", response_model=MenuItem)
async def update_menu_item(item_id: str, data: MenuItemUpdate, current_admin: dict = Depends(get_current_admin)):
    tenant_id = current_admin.get('tenant_id')
    
    # Verify item belongs to tenant
    existing = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Menu item not found")
    if existing.get('tenant_id') != tenant_id and not current_admin.get('is_platform_admin'):
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.menu_items.update_one({"id": item_id}, {"$set": update_data})
    item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if isinstance(item.get('created_at'), str):
        item['created_at'] = datetime.fromisoformat(item['created_at'])
    return item

@api_router.delete("/menu-items/{item_id}")
async def delete_menu_item(item_id: str, current_admin: dict = Depends(get_current_admin)):
    tenant_id = current_admin.get('tenant_id')
    
    # Verify item belongs to tenant
    existing = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Menu item not found")
    if existing.get('tenant_id') != tenant_id and not current_admin.get('is_platform_admin'):
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.menu_items.delete_one({"id": item_id})
    return {"message": "Menu item deleted"}

# ============ TABLE ROUTES (Tenant-aware) ============

@api_router.get("/r/{slug}/tables", response_model=List[Table])
async def get_public_tables(slug: str):
    """Get tables for public view"""
    tenant = await get_tenant_from_slug(slug)
    tables = await db.tables.find({"tenant_id": tenant['id'], "is_active": True}, {"_id": 0}).sort("table_number", 1).to_list(100)
    for table in tables:
        if isinstance(table.get('created_at'), str):
            table['created_at'] = datetime.fromisoformat(table['created_at'])
    return tables

@api_router.get("/tables", response_model=List[Table])
async def get_tables(current_admin: dict = Depends(get_current_admin)):
    tenant_id = current_admin.get('tenant_id')
    if not tenant_id or tenant_id == "platform":
        raise HTTPException(status_code=400, detail="No tenant associated")
    
    tables = await db.tables.find({"tenant_id": tenant_id, "is_active": True}, {"_id": 0}).sort("table_number", 1).to_list(100)
    for table in tables:
        if isinstance(table.get('created_at'), str):
            table['created_at'] = datetime.fromisoformat(table['created_at'])
    return tables

@api_router.get("/tables/all", response_model=List[Table])
async def get_all_tables(current_admin: dict = Depends(get_current_admin)):
    tenant_id = current_admin.get('tenant_id')
    if not tenant_id or tenant_id == "platform":
        raise HTTPException(status_code=400, detail="No tenant associated")
    
    tables = await db.tables.find({"tenant_id": tenant_id}, {"_id": 0}).sort("table_number", 1).to_list(100)
    for table in tables:
        if isinstance(table.get('created_at'), str):
            table['created_at'] = datetime.fromisoformat(table['created_at'])
    return tables

@api_router.get("/tables/qr/{qr_code}", response_model=dict)
async def get_table_by_qr(qr_code: str):
    """Get table by QR code - returns table and tenant info"""
    table = await db.tables.find_one({"qr_code": qr_code, "is_active": True}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Tafel niet gevonden")
    if isinstance(table.get('created_at'), str):
        table['created_at'] = datetime.fromisoformat(table['created_at'])
    
    # Get tenant info
    tenant = await db.tenants.find_one({"id": table['tenant_id']}, {"_id": 0})
    if not tenant or not tenant.get('is_active'):
        raise HTTPException(status_code=404, detail="Restaurant niet gevonden")
    
    return {
        "table": table,
        "tenant": {
            "id": tenant['id'],
            "slug": tenant['slug'],
            "name": tenant['name'],
            "logo_url": tenant.get('logo_url'),
            "primary_color": tenant.get('primary_color', '#5A6B5D'),
            "secondary_color": tenant.get('secondary_color', '#E8E6E1'),
            "currency_symbol": tenant.get('currency_symbol', '€')
        }
    }

@api_router.post("/tables", response_model=Table)
async def create_table(data: TableCreate, current_admin: dict = Depends(get_current_admin)):
    tenant_id = current_admin.get('tenant_id')
    if not tenant_id or tenant_id == "platform":
        raise HTTPException(status_code=400, detail="No tenant associated")
    
    table = Table(tenant_id=tenant_id, **data.model_dump())
    doc = table.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.tables.insert_one(doc)
    return table

@api_router.put("/tables/{table_id}", response_model=Table)
async def update_table(table_id: str, data: TableUpdate, current_admin: dict = Depends(get_current_admin)):
    tenant_id = current_admin.get('tenant_id')
    
    existing = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Table not found")
    if existing.get('tenant_id') != tenant_id and not current_admin.get('is_platform_admin'):
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.tables.update_one({"id": table_id}, {"$set": update_data})
    table = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if isinstance(table.get('created_at'), str):
        table['created_at'] = datetime.fromisoformat(table['created_at'])
    return table

@api_router.delete("/tables/{table_id}")
async def delete_table(table_id: str, current_admin: dict = Depends(get_current_admin)):
    tenant_id = current_admin.get('tenant_id')
    
    existing = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Table not found")
    if existing.get('tenant_id') != tenant_id and not current_admin.get('is_platform_admin'):
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.tables.delete_one({"id": table_id})
    return {"message": "Table deleted"}

@api_router.post("/tables/{table_id}/regenerate-qr", response_model=Table)
async def regenerate_qr(table_id: str, current_admin: dict = Depends(get_current_admin)):
    tenant_id = current_admin.get('tenant_id')
    
    existing = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Table not found")
    if existing.get('tenant_id') != tenant_id and not current_admin.get('is_platform_admin'):
        raise HTTPException(status_code=403, detail="Access denied")
    
    new_qr = str(uuid.uuid4())
    await db.tables.update_one({"id": table_id}, {"$set": {"qr_code": new_qr}})
    table = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if isinstance(table.get('created_at'), str):
        table['created_at'] = datetime.fromisoformat(table['created_at'])
    return table

# ============ ORDER ROUTES (Tenant-aware) ============

@api_router.get("/r/{slug}/orders", response_model=List[Order])
async def get_public_orders(slug: str, table_id: Optional[str] = None):
    """Get orders for a table (customer view)"""
    tenant = await get_tenant_from_slug(slug)
    query = {"tenant_id": tenant['id']}
    if table_id:
        query["table_id"] = table_id
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if isinstance(order.get('updated_at'), str):
            order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    return orders

@api_router.get("/orders", response_model=List[Order])
async def get_orders(status: Optional[str] = None, table_id: Optional[str] = None, current_admin: dict = Depends(get_current_admin)):
    tenant_id = current_admin.get('tenant_id')
    if not tenant_id or tenant_id == "platform":
        raise HTTPException(status_code=400, detail="No tenant associated")
    
    query = {"tenant_id": tenant_id}
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
async def get_active_orders(current_admin: dict = Depends(get_current_admin)):
    tenant_id = current_admin.get('tenant_id')
    if not tenant_id or tenant_id == "platform":
        raise HTTPException(status_code=400, detail="No tenant associated")
    
    orders = await db.orders.find(
        {"tenant_id": tenant_id, "status": {"$in": ["new", "preparing", "ready"]}},
        {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if isinstance(order.get('updated_at'), str):
            order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    return orders

@api_router.get("/r/{slug}/orders/active", response_model=List[Order])
async def get_public_active_orders(slug: str):
    """Get active orders for KDS (public route for kitchen display)"""
    tenant = await get_tenant_from_slug(slug)
    orders = await db.orders.find(
        {"tenant_id": tenant['id'], "status": {"$in": ["new", "preparing", "ready"]}},
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

@api_router.post("/r/{slug}/orders", response_model=Order)
async def create_public_order(slug: str, data: OrderCreate):
    """Create order from customer (public route)"""
    tenant = await get_tenant_from_slug(slug)
    
    # Get table info
    table = await db.tables.find_one({"id": data.table_id, "tenant_id": tenant['id']}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Tafel niet gevonden")
    
    # Calculate total
    total = sum(item.subtotal for item in data.items)
    
    order = Order(
        tenant_id=tenant['id'],
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
    
    # Update tenant order count
    await db.tenants.update_one(
        {"id": tenant['id']},
        {"$inc": {"orders_this_month": 1}}
    )
    
    return order

@api_router.post("/orders", response_model=Order)
async def create_order(data: OrderCreate, current_admin: dict = Depends(get_current_admin)):
    """Create order from admin panel"""
    tenant_id = current_admin.get('tenant_id')
    if not tenant_id or tenant_id == "platform":
        raise HTTPException(status_code=400, detail="No tenant associated")
    
    # Get table info
    table = await db.tables.find_one({"id": data.table_id, "tenant_id": tenant_id}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    # Calculate total
    total = sum(item.subtotal for item in data.items)
    
    order = Order(
        tenant_id=tenant_id,
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
    """Seed sample data for demo purposes - creates a demo tenant"""
    # Check if demo tenant already exists
    existing_tenant = await db.tenants.find_one({"slug": "demo-restaurant"}, {"_id": 0})
    if existing_tenant:
        return {"message": "Demo data already seeded", "tenant_slug": "demo-restaurant"}
    
    # Create demo tenant
    trial_end = datetime.now(timezone.utc) + timedelta(days=14)
    demo_tenant = Tenant(
        slug="demo-restaurant",
        name="Demo Restaurant",
        email="demo@restaurant.nl",
        trial_ends_at=trial_end,
        is_onboarded=True,
        last_order_reset=datetime.now(timezone.utc)
    )
    
    tenant_doc = demo_tenant.model_dump()
    tenant_doc['created_at'] = tenant_doc['created_at'].isoformat()
    tenant_doc['updated_at'] = tenant_doc['updated_at'].isoformat()
    tenant_doc['trial_ends_at'] = tenant_doc['trial_ends_at'].isoformat()
    tenant_doc['last_order_reset'] = tenant_doc['last_order_reset'].isoformat()
    await db.tenants.insert_one(tenant_doc)
    
    # Create demo admin
    demo_admin = AdminUser(
        tenant_id=demo_tenant.id,
        email="admin@test.nl",
        password_hash=hash_password("password"),
        name="Demo Admin",
        role="admin"
    )
    admin_doc = demo_admin.model_dump()
    admin_doc['created_at'] = admin_doc['created_at'].isoformat()
    await db.admins.insert_one(admin_doc)
    
    tenant_id = demo_tenant.id
    
    # Create sample categories
    categories = [
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "name": "Voorgerechten", "description": "Heerlijke starters", "image_url": "https://images.unsplash.com/photo-1541014741259-de529411b96a?w=400", "sort_order": 1, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "name": "Hoofdgerechten", "description": "Onze specialiteiten", "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400", "sort_order": 2, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "name": "Burgers", "description": "Ambachtelijke burgers", "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400", "sort_order": 3, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "name": "Pizza", "description": "Verse pizza's uit de oven", "image_url": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400", "sort_order": 4, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "name": "Dranken", "description": "Verfrissende drankjes", "image_url": "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400", "sort_order": 5, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "name": "Desserts", "description": "Zoete afsluiting", "image_url": "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400", "sort_order": 6, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    
    await db.categories.insert_many(categories)
    
    # Create sample menu items
    menu_items = [
        # Voorgerechten
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "category_id": categories[0]["id"], "name": "Krokante Calamari", "description": "Licht gepaneerde inktvisringen met aioli", "price": 12.99, "image_url": "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400", "dietary_tags": ["zeevruchten"], "modifier_groups": [], "is_available": True, "sort_order": 1, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "category_id": categories[0]["id"], "name": "Bruschetta", "description": "Geroosterd brood met verse tomaat en basilicum", "price": 8.99, "image_url": "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400", "dietary_tags": ["vegetarisch", "veganistisch"], "modifier_groups": [], "is_available": True, "sort_order": 2, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "category_id": categories[0]["id"], "name": "Kippenvleugels", "description": "Krokante vleugels met saus naar keuze", "price": 14.99, "image_url": "https://images.unsplash.com/photo-1608039829572-9b0b2246d12f?w=400", "dietary_tags": [], "modifier_groups": [{"id": str(uuid.uuid4()), "name": "Saus", "required": True, "max_selections": 1, "options": [{"id": str(uuid.uuid4()), "name": "Buffalo", "price": 0}, {"id": str(uuid.uuid4()), "name": "BBQ", "price": 0}, {"id": str(uuid.uuid4()), "name": "Honing Knoflook", "price": 0}]}], "is_available": True, "sort_order": 3, "created_at": datetime.now(timezone.utc).isoformat()},
        
        # Hoofdgerechten
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "category_id": categories[1]["id"], "name": "Gegrilde Zalm", "description": "Atlantische zalm met citroen-botersaus", "price": 24.99, "image_url": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400", "dietary_tags": ["zeevruchten", "glutenvrij"], "modifier_groups": [{"id": str(uuid.uuid4()), "name": "Bijgerecht", "required": True, "max_selections": 1, "options": [{"id": str(uuid.uuid4()), "name": "Aardappelpuree", "price": 0}, {"id": str(uuid.uuid4()), "name": "Gestoomde groenten", "price": 0}, {"id": str(uuid.uuid4()), "name": "Groene salade", "price": 0}]}], "is_available": True, "sort_order": 1, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "category_id": categories[1]["id"], "name": "Ribeye Steak", "description": "300g prime ribeye naar perfectie bereid", "price": 34.99, "image_url": "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400", "dietary_tags": ["glutenvrij"], "modifier_groups": [{"id": str(uuid.uuid4()), "name": "Garing", "required": True, "max_selections": 1, "options": [{"id": str(uuid.uuid4()), "name": "Rare", "price": 0}, {"id": str(uuid.uuid4()), "name": "Medium Rare", "price": 0}, {"id": str(uuid.uuid4()), "name": "Medium", "price": 0}, {"id": str(uuid.uuid4()), "name": "Doorbakken", "price": 0}]}], "is_available": True, "sort_order": 2, "created_at": datetime.now(timezone.utc).isoformat()},
        
        # Burgers
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "category_id": categories[2]["id"], "name": "Klassieke Cheeseburger", "description": "Angus rundvlees met cheddar en speciale saus", "price": 16.99, "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400", "dietary_tags": [], "modifier_groups": [{"id": str(uuid.uuid4()), "name": "Extra's", "required": False, "max_selections": 3, "options": [{"id": str(uuid.uuid4()), "name": "Bacon", "price": 2.5}, {"id": str(uuid.uuid4()), "name": "Extra Kaas", "price": 1.5}, {"id": str(uuid.uuid4()), "name": "Avocado", "price": 2.0}]}], "is_available": True, "sort_order": 1, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "category_id": categories[2]["id"], "name": "Champignon Swiss Burger", "description": "Met gebakken champignons en Zwitserse kaas", "price": 18.99, "image_url": "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400", "dietary_tags": [], "modifier_groups": [], "is_available": True, "sort_order": 2, "created_at": datetime.now(timezone.utc).isoformat()},
        
        # Pizza
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "category_id": categories[3]["id"], "name": "Margherita", "description": "Verse mozzarella, tomaat en basilicum", "price": 14.99, "image_url": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400", "dietary_tags": ["vegetarisch"], "modifier_groups": [{"id": str(uuid.uuid4()), "name": "Formaat", "required": True, "max_selections": 1, "options": [{"id": str(uuid.uuid4()), "name": "Medium (30cm)", "price": 0}, {"id": str(uuid.uuid4()), "name": "Large (40cm)", "price": 4}]}], "is_available": True, "sort_order": 1, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "category_id": categories[3]["id"], "name": "Pepperoni Supreme", "description": "Royaal belegd met pepperoni en mozzarella", "price": 17.99, "image_url": "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400", "dietary_tags": [], "modifier_groups": [{"id": str(uuid.uuid4()), "name": "Formaat", "required": True, "max_selections": 1, "options": [{"id": str(uuid.uuid4()), "name": "Medium (30cm)", "price": 0}, {"id": str(uuid.uuid4()), "name": "Large (40cm)", "price": 4}]}], "is_available": True, "sort_order": 2, "created_at": datetime.now(timezone.utc).isoformat()},
        
        # Dranken
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "category_id": categories[4]["id"], "name": "Verse Limonade", "description": "Huisgemaakt met verse citroenen", "price": 4.99, "image_url": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400", "dietary_tags": ["veganistisch", "glutenvrij"], "modifier_groups": [], "is_available": True, "sort_order": 1, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "category_id": categories[4]["id"], "name": "IJskoffie", "description": "Cold brew geserveerd op ijs", "price": 5.99, "image_url": "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400", "dietary_tags": ["veganistisch"], "modifier_groups": [{"id": str(uuid.uuid4()), "name": "Melk", "required": False, "max_selections": 1, "options": [{"id": str(uuid.uuid4()), "name": "Volle Melk", "price": 0}, {"id": str(uuid.uuid4()), "name": "Havermelk", "price": 0.5}, {"id": str(uuid.uuid4()), "name": "Amandelmelk", "price": 0.5}]}], "is_available": True, "sort_order": 2, "created_at": datetime.now(timezone.utc).isoformat()},
        
        # Desserts
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "category_id": categories[5]["id"], "name": "Chocolade Lava Cake", "description": "Warme cake met vloeibaar chocolade hart", "price": 9.99, "image_url": "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400", "dietary_tags": ["vegetarisch"], "modifier_groups": [], "is_available": True, "sort_order": 1, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "category_id": categories[5]["id"], "name": "New York Cheesecake", "description": "Romige cheesecake met bessensaus", "price": 8.99, "image_url": "https://images.unsplash.com/photo-1524351199678-941a58a3df50?w=400", "dietary_tags": ["vegetarisch"], "modifier_groups": [], "is_available": True, "sort_order": 2, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    
    await db.menu_items.insert_many(menu_items)
    
    # Create sample tables
    tables = [
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "table_number": "1", "qr_code": str(uuid.uuid4()), "capacity": 2, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "table_number": "2", "qr_code": str(uuid.uuid4()), "capacity": 4, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "table_number": "3", "qr_code": str(uuid.uuid4()), "capacity": 4, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "table_number": "4", "qr_code": str(uuid.uuid4()), "capacity": 6, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "table_number": "5", "qr_code": str(uuid.uuid4()), "capacity": 8, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    
    await db.tables.insert_many(tables)
    
    return {
        "message": "Demo data seeded successfully",
        "tenant_slug": "demo-restaurant",
        "admin_email": "admin@test.nl",
        "admin_password": "password",
        "categories": len(categories),
        "menu_items": len(menu_items),
        "tables": len(tables)
    }

# Include the router in the main app
app.include_router(api_router)

# Mount static files for uploads under /api/uploads to work with ingress
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

@app.on_event("startup")
async def create_platform_admin_on_startup():
    """Auto-create the platform admin account from env vars if it doesn't exist."""
    existing = await db.admins.find_one({"email": PLATFORM_ADMIN_EMAIL}, {"_id": 0})
    if not existing:
        admin = AdminUser(
            tenant_id="platform",
            email=PLATFORM_ADMIN_EMAIL,
            password_hash=hash_password(PLATFORM_ADMIN_PASSWORD),
            name=PLATFORM_ADMIN_NAME,
            role="platform_admin",
            is_platform_admin=True
        )
        doc = admin.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.admins.insert_one(doc)
        logging.info(f"Platform admin auto-created: {PLATFORM_ADMIN_EMAIL}")
    else:
        logging.info(f"Platform admin already exists: {PLATFORM_ADMIN_EMAIL}")

# ============ STRIPE SUBSCRIPTION ROUTES ============
# from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest

# Subscription plans (fixed pricing)
SUBSCRIPTION_PLANS = {
    "basic": {"name": "Basis", "price": 29.00, "features": ["10 tafels", "100 bestellingen/maand", "Basis ondersteuning"]},
    "pro": {"name": "Pro", "price": 79.00, "features": ["Onbeperkt tafels", "Onbeperkt bestellingen", "Prioriteit ondersteuning", "Rapportages"]},
    "enterprise": {"name": "Enterprise", "price": 199.00, "features": ["Alles in Pro", "Dedicated support", "Custom integraties", "SLA garantie"]}
}

class SubscriptionRequest(BaseModel):
    plan_id: str
    origin_url: str

@api_router.get("/subscription/plans")
async def get_subscription_plans():
    """Get available subscription plans"""
    return {"plans": SUBSCRIPTION_PLANS}

@api_router.post("/subscription/checkout")
async def create_subscription_checkout(data: SubscriptionRequest, request: Request, current_admin: dict = Depends(get_current_admin)):
    """Create a Stripe checkout session for subscription"""
    tenant_id = current_admin.get('tenant_id')
    if not tenant_id or tenant_id == "platform":
        raise HTTPException(status_code=400, detail="No tenant associated")
    
    # Validate plan
    if data.plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid subscription plan")
    
    plan = SUBSCRIPTION_PLANS[data.plan_id]
    
    # Get tenant info
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Initialize Stripe checkout
    stripe_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url=webhook_url)
    
    # Create success and cancel URLs
    success_url = f"{data.origin_url}/admin/settings?payment=success&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/admin/settings?payment=cancelled"
    
    # Create checkout session
    checkout_request = CheckoutSessionRequest(
        amount=plan["price"],
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "tenant_id": tenant_id,
            "plan_id": data.plan_id,
            "plan_name": plan["name"]
        }
    )
    
    try:
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record
        transaction = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "session_id": session.session_id,
            "plan_id": data.plan_id,
            "amount": plan["price"],
            "currency": "EUR",
            "status": "pending",
            "payment_status": "initiated",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(transaction)
        
        return {"url": session.url, "session_id": session.session_id}
    except Exception as e:
        logger.error(f"Stripe checkout error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")

@api_router.get("/subscription/status/{session_id}")
async def get_payment_status(session_id: str, request: Request):
    """Get payment status for a checkout session"""
    stripe_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url=webhook_url)
    
    try:
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction if paid
        if status.payment_status == "paid":
            transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            if transaction and transaction.get("status") != "completed":
                # Update transaction
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"status": "completed", "payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                
                # Update tenant subscription status
                await db.tenants.update_one(
                    {"id": transaction["tenant_id"]},
                    {"$set": {
                        "subscription_status": "active",
                        "subscription_plan": transaction["plan_id"],
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency
        }
    except Exception as e:
        logger.error(f"Error getting payment status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get payment status")

@api_router.post("/webhook/stripe")
async def handle_stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    stripe_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_key, webhook_url=webhook_url)
    
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        logger.info(f"Webhook received: {webhook_response.event_type}")
        
        # Handle different event types
        if webhook_response.event_type == "checkout.session.completed":
            session_id = webhook_response.session_id
            metadata = webhook_response.metadata
            
            if session_id and metadata:
                tenant_id = metadata.get("tenant_id")
                plan_id = metadata.get("plan_id")
                
                if tenant_id and plan_id:
                    # Update transaction
                    await db.payment_transactions.update_one(
                        {"session_id": session_id},
                        {"$set": {"status": "completed", "payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
                    )
                    
                    # Update tenant subscription
                    await db.tenants.update_one(
                        {"id": tenant_id},
                        {"$set": {
                            "subscription_status": "active",
                            "subscription_plan": plan_id,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
        
        return {"received": True}
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"received": True}  # Always return 200 to Stripe

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # frontend URL
    allow_credentials=True,
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
