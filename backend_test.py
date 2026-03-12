#!/usr/bin/env python3
"""
Backend API Test Suite for Restaurant QR Ordering System
Tests all critical endpoints and functionality
"""

import requests
import json
import sys
from datetime import datetime

class RestaurantAPITester:
    def __init__(self):
        self.base_url = "https://dine-flow-21.preview.emergentagent.com/api"
        self.admin_token = None
        self.test_admin_email = f"test_admin_{datetime.now().strftime('%H%M%S')}@test.com"
        self.test_password = "TestPass123!"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.sample_category_id = None
        self.sample_item_id = None
        self.sample_table_id = None
        self.sample_order_id = None

    def log_result(self, test_name, passed, details=""):
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
            status = "✅ PASSED"
        else:
            status = "❌ FAILED"
        
        result = f"{status} - {test_name}"
        if details:
            result += f" ({details})"
        print(result)
        self.test_results.append({"test": test_name, "passed": passed, "details": details})

    def make_request(self, method, endpoint, data=None, auth_required=False):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.admin_token:
            headers['Authorization'] = f'Bearer {self.admin_token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            
            return response
        except requests.RequestException as e:
            print(f"Request error: {str(e)}")
            return None

    def test_health_check(self):
        """Test basic API health"""
        print("\n🔍 Testing API Health...")
        response = self.make_request('GET', '')
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if data.get('message') and 'Restaurant QR Ordering API' in data['message']:
                    self.log_result("API Health Check", True, "API is responding correctly")
                    return True
            except json.JSONDecodeError:
                pass
        
        self.log_result("API Health Check", False, f"Status: {response.status_code if response else 'No response'}")
        return False

    def test_seed_data(self):
        """Test seeding sample data"""
        print("\n🌱 Testing Data Seeding...")
        response = self.make_request('POST', 'seed')
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if 'Sample data seeded successfully' in data.get('message', '') or 'Data already seeded' in data.get('message', ''):
                    self.log_result("Seed Data", True, data.get('message'))
                    return True
            except json.JSONDecodeError:
                pass
        
        self.log_result("Seed Data", False, f"Status: {response.status_code if response else 'No response'}")
        return False

    def test_admin_registration(self):
        """Test admin user registration"""
        print("\n👤 Testing Admin Registration...")
        data = {
            "email": self.test_admin_email,
            "password": self.test_password,
            "name": "Test Admin"
        }
        
        response = self.make_request('POST', 'auth/register', data)
        
        if response and response.status_code == 200:
            try:
                result = response.json()
                if result.get('token') and result.get('admin'):
                    self.admin_token = result['token']
                    self.log_result("Admin Registration", True, "Admin created and logged in")
                    return True
            except json.JSONDecodeError:
                pass
        
        self.log_result("Admin Registration", False, f"Status: {response.status_code if response else 'No response'}")
        return False

    def test_admin_login(self):
        """Test admin login"""
        print("\n🔐 Testing Admin Login...")
        data = {
            "email": self.test_admin_email,
            "password": self.test_password
        }
        
        response = self.make_request('POST', 'auth/login', data)
        
        if response and response.status_code == 200:
            try:
                result = response.json()
                if result.get('token'):
                    self.admin_token = result['token']
                    self.log_result("Admin Login", True, "Successfully logged in")
                    return True
            except json.JSONDecodeError:
                pass
        
        self.log_result("Admin Login", False, f"Status: {response.status_code if response else 'No response'}")
        return False

    def test_categories_api(self):
        """Test categories CRUD operations"""
        print("\n📂 Testing Categories API...")
        
        # Test GET categories (public)
        response = self.make_request('GET', 'categories')
        if response and response.status_code == 200:
            try:
                categories = response.json()
                if isinstance(categories, list):
                    self.log_result("Get Categories", True, f"Retrieved {len(categories)} categories")
                    if categories:
                        self.sample_category_id = categories[0]['id']
                else:
                    self.log_result("Get Categories", False, "Invalid response format")
            except json.JSONDecodeError:
                self.log_result("Get Categories", False, "Invalid JSON response")
        else:
            self.log_result("Get Categories", False, f"Status: {response.status_code if response else 'No response'}")

    def test_menu_items_api(self):
        """Test menu items API"""
        print("\n🍽️ Testing Menu Items API...")
        
        # Test GET menu items (public)
        response = self.make_request('GET', 'menu-items')
        if response and response.status_code == 200:
            try:
                items = response.json()
                if isinstance(items, list):
                    self.log_result("Get Menu Items", True, f"Retrieved {len(items)} items")
                    if items:
                        self.sample_item_id = items[0]['id']
                else:
                    self.log_result("Get Menu Items", False, "Invalid response format")
            except json.JSONDecodeError:
                self.log_result("Get Menu Items", False, "Invalid JSON response")
        else:
            self.log_result("Get Menu Items", False, f"Status: {response.status_code if response else 'No response'}")

        # Test GET menu items by category
        if self.sample_category_id:
            response = self.make_request('GET', f'menu-items?category_id={self.sample_category_id}')
            if response and response.status_code == 200:
                try:
                    items = response.json()
                    if isinstance(items, list):
                        self.log_result("Get Menu Items by Category", True, f"Retrieved {len(items)} items for category")
                    else:
                        self.log_result("Get Menu Items by Category", False, "Invalid response format")
                except json.JSONDecodeError:
                    self.log_result("Get Menu Items by Category", False, "Invalid JSON response")
            else:
                self.log_result("Get Menu Items by Category", False, f"Status: {response.status_code if response else 'No response'}")

    def test_tables_api(self):
        """Test tables API"""
        print("\n🪑 Testing Tables API...")
        
        # Test GET tables (public)
        response = self.make_request('GET', 'tables')
        if response and response.status_code == 200:
            try:
                tables = response.json()
                if isinstance(tables, list):
                    self.log_result("Get Tables", True, f"Retrieved {len(tables)} tables")
                    if tables:
                        self.sample_table_id = tables[0]['id']
                else:
                    self.log_result("Get Tables", False, "Invalid response format")
            except json.JSONDecodeError:
                self.log_result("Get Tables", False, "Invalid JSON response")
        else:
            self.log_result("Get Tables", False, f"Status: {response.status_code if response else 'No response'}")

    def test_orders_api(self):
        """Test orders API"""
        print("\n📋 Testing Orders API...")
        
        # Test creating an order (public)
        if self.sample_table_id and self.sample_item_id:
            order_data = {
                "table_id": self.sample_table_id,
                "items": [
                    {
                        "menu_item_id": self.sample_item_id,
                        "menu_item_name": "Test Item",
                        "quantity": 2,
                        "unit_price": 15.99,
                        "modifiers": [],
                        "special_instructions": "Test order",
                        "subtotal": 31.98
                    }
                ],
                "customer_name": "Test Customer",
                "notes": "Test order notes"
            }
            
            response = self.make_request('POST', 'orders', order_data)
            if response and response.status_code == 200:
                try:
                    order = response.json()
                    if order.get('id'):
                        self.sample_order_id = order['id']
                        self.log_result("Create Order", True, f"Order created: {order['id'][:8]}")
                    else:
                        self.log_result("Create Order", False, "No order ID returned")
                except json.JSONDecodeError:
                    self.log_result("Create Order", False, "Invalid JSON response")
            else:
                self.log_result("Create Order", False, f"Status: {response.status_code if response else 'No response'}")
        else:
            self.log_result("Create Order", False, "Missing table or item data for testing")

        # Test GET active orders (public)
        response = self.make_request('GET', 'orders/active')
        if response and response.status_code == 200:
            try:
                orders = response.json()
                if isinstance(orders, list):
                    self.log_result("Get Active Orders", True, f"Retrieved {len(orders)} active orders")
                else:
                    self.log_result("Get Active Orders", False, "Invalid response format")
            except json.JSONDecodeError:
                self.log_result("Get Active Orders", False, "Invalid JSON response")
        else:
            self.log_result("Get Active Orders", False, f"Status: {response.status_code if response else 'No response'}")

        # Test order status update
        if self.sample_order_id:
            status_data = {"status": "preparing"}
            response = self.make_request('PUT', f'orders/{self.sample_order_id}/status', status_data)
            if response and response.status_code == 200:
                try:
                    order = response.json()
                    if order.get('status') == 'preparing':
                        self.log_result("Update Order Status", True, "Status updated to preparing")
                    else:
                        self.log_result("Update Order Status", False, "Status not updated correctly")
                except json.JSONDecodeError:
                    self.log_result("Update Order Status", False, "Invalid JSON response")
            else:
                self.log_result("Update Order Status", False, f"Status: {response.status_code if response else 'No response'}")

    def test_settings_api(self):
        """Test restaurant settings API"""
        print("\n⚙️ Testing Settings API...")
        
        # Test GET settings (public)
        response = self.make_request('GET', 'settings')
        if response and response.status_code == 200:
            try:
                settings = response.json()
                if settings.get('name'):
                    self.log_result("Get Settings", True, f"Restaurant name: {settings['name']}")
                else:
                    self.log_result("Get Settings", False, "No restaurant name in response")
            except json.JSONDecodeError:
                self.log_result("Get Settings", False, "Invalid JSON response")
        else:
            self.log_result("Get Settings", False, f"Status: {response.status_code if response else 'No response'}")

    def run_all_tests(self):
        """Run comprehensive backend test suite"""
        print("🚀 Starting Restaurant QR Ordering API Test Suite")
        print(f"Testing endpoint: {self.base_url}")
        print("=" * 60)
        
        # Core API tests
        if not self.test_health_check():
            print("❌ API is not responding. Stopping tests.")
            return False
        
        self.test_seed_data()
        
        # Authentication tests
        if not self.test_admin_registration():
            print("❌ Admin registration failed. Some tests may be skipped.")
        
        # Data retrieval tests
        self.test_categories_api()
        self.test_menu_items_api() 
        self.test_tables_api()
        self.test_orders_api()
        self.test_settings_api()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results Summary")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # List failed tests
        failed_tests = [r for r in self.test_results if not r['passed']]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = RestaurantAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())