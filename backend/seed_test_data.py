import os
import uuid
import random
from datetime import datetime, timezone
import bcrypt
from pymongo import MongoClient

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(mongo_url)
db = client['qr_ordering_db']

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def seed_data():
    print("Starting data seeding process...")
    
    # 1. Create a Test Tenant (Restaurant)
    tenant_id = str(uuid.uuid4())
    slug = f"test-reliability-{str(uuid.uuid4())[:8]}"
    
    tenant_doc = {
        "id": tenant_id,
        "slug": slug,
        "name": "Reliability Test Restaurant",
        "email": f"test.admin.{slug}@example.com",
        "phone": "+1234567890",
        "logo_url": None,
        "primary_color": "#5A6B5D",
        "secondary_color": "#E8E6E1",
        "currency": "EUR",
        "currency_symbol": "€",
        "subscription_status": "active",
        "subscription_plan": "pro",
        "is_active": True,
        "is_onboarded": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    db.tenants.insert_one(tenant_doc)
    print(f"Created Test Restaurant: {tenant_doc['name']} (slug: {slug})")

    # Create an admin user for the tenant
    admin_id = str(uuid.uuid4())
    admin_doc = {
        "id": admin_id,
        "tenant_id": tenant_id,
        "email": tenant_doc["email"],
        "password_hash": hash_password("Test1234!"),
        "name": "Test Admin",
        "role": "admin",
        "is_platform_admin": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.admins.insert_one(admin_doc)
    print(f"Created Admin User: {admin_doc['email']} with password 'Test1234!'")

    # 2. Create 100 Categories
    print("Generating 100 Categories...")
    category_ids = []
    categories = []
    for i in range(1, 101):
        cat_id = str(uuid.uuid4())
        category_ids.append(cat_id)
        
        cat_doc = {
            "id": cat_id,
            "tenant_id": tenant_id,
            "name": f"Test Category {i}",
            "sort_order": i,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        categories.append(cat_doc)
        
    db.categories.insert_many(categories)
    print("Successfully inserted 100 Categories.")

    # 3. Create 100 Menu Items (distributed randomly or sequentially among categories)
    print("Generating 100 Menu Items...")
    menu_items = []
    for i in range(1, 101):
        item_id = str(uuid.uuid4())
        
        # We can either put 1 item per category or distribute randomly. 1 per category is easy:
        cat_id = category_ids[i - 1] 
        
        item_doc = {
            "id": item_id,
            "tenant_id": tenant_id,
            "category_id": cat_id,
            "name": f"Test Menu Item {i}",
            "description": f"A sample description for test item {i}",
            "price": float(round(random.uniform(5.0, 30.0), 2)),
            "is_available": True,
            "sort_order": i,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        menu_items.append(item_doc)
        
    db.menu_items.insert_many(menu_items)
    print("Successfully inserted 100 Menu Items.")

    # 4. Create 100 Tables
    print("Generating 100 Tables...")
    tables = []
    for i in range(1, 101):
        table_id = str(uuid.uuid4())
        
        table_doc = {
            "id": table_id,
            "tenant_id": tenant_id,
            "table_number": str(i),
            "qr_code": str(uuid.uuid4()),
            "capacity": random.choice([2, 4, 6, 8]),
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        tables.append(table_doc)
        
    db.tables.insert_many(tables)
    print("Successfully inserted 100 Tables.")

    print("\n--- Seeding Complete ---")
    print(f"Login Email:   {admin_doc['email']}")
    print(f"Login Password: Test1234!")
    print(f"Restaurant URL: /r/{slug}")

if __name__ == "__main__":
    seed_data()
