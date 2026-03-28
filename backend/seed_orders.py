import os
import uuid
import random
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(mongo_url)
db = client['qr_ordering_db']

def seed_orders():
    print("Starting process to generate 500 random orders...")
    
    # Find the test tenant created previously
    tenant = db.tenants.find_one({"name": "Reliability Test Restaurant"})
    
    if not tenant:
        print("Could not find the test restaurant. Please run seed_test_data.py first.")
        return
        
    tenant_id = tenant["id"]
    print(f"Using Tenant: {tenant['name']} (ID: {tenant_id})")
    
    # Fetch menu items and tables for this tenant
    menu_items = list(db.menu_items.find({"tenant_id": tenant_id}))
    tables = list(db.tables.find({"tenant_id": tenant_id}))
    
    if not menu_items or not tables:
        print("No menu items or tables found for this restaurant.")
        return
        
    print(f"Found {len(menu_items)} menu items and {len(tables)} tables. Generating 500 orders...")
    
    orders = []
    statuses = ["new", "preparing", "ready", "served", "cancelled"]
    
    # To make timestamps realistic, spread them over the last 7 days
    now = datetime.now(timezone.utc)
    
    for i in range(1, 501):
        order_id = str(uuid.uuid4())
        
        table = random.choice(tables)
        
        # Pick 1 to 5 random items for the order
        num_items = random.randint(1, 5)
        selected_items = random.sample(menu_items, min(num_items, len(menu_items)))
        
        order_items = []
        total_price = 0.0
        
        for item in selected_items:
            quantity = random.randint(1, 3)
            unit_price = item.get("price", 10.0)
            subtotal = quantity * unit_price
            
            order_items.append({
                "menu_item_id": item["id"],
                "menu_item_name": item["name"],
                "quantity": quantity,
                "unit_price": unit_price,
                "modifiers": [],
                "special_instructions": random.choice([None, "No onions", "Extra sauce", "Allergy to nuts"]),
                "subtotal": subtotal
            })
            total_price += subtotal
            
        random_days_ago = random.randint(0, 7)
        random_minutes_ago = random.randint(0, 1440)
        created_time = now - timedelta(days=random_days_ago, minutes=random_minutes_ago)
        
        # Generate the order document
        order_doc = {
            "id": order_id,
            "tenant_id": tenant_id,
            "table_id": table["id"],
            "table_number": table["table_number"],
            "items": order_items,
            "total": float(round(total_price, 2)),
            "status": random.choice(statuses),
            "customer_name": f"Test Customer {i}",
            "notes": random.choice([None, "Bring card machine", "Outside table"]),
            "created_at": created_time.isoformat(),
            "updated_at": (created_time + timedelta(minutes=random.randint(5, 45))).isoformat()
        }
        
        orders.append(order_doc)
        
    db.orders.insert_many(orders)
    
    # Update orders_this_month on the tenant model
    db.tenants.update_one(
        {"id": tenant_id},
        {"$inc": {"orders_this_month": 500}}
    )

    print(f"Successfully generated 500 random orders for {tenant['name']}.")
    print("You can verify these orders in the dashboard or via API.")

if __name__ == "__main__":
    seed_orders()
