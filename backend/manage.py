# manage.py

import sys
from app import create_app
from app.models import User

app = create_app()

def list_users():
    """Lists all users with their admin status."""
    with app.app_context():
        # Using the paginated list function to get all users
        # For a large number of users, this should be handled more carefully
        all_users_data = User.list_paginated(page=1, per_page=1000) # Assuming max 1000 users for this script
        users = all_users_data.get("items", [])
        
        if not users:
            print("No users found in the database.")
            return
        
        print(f"Found {len(users)} users:")
        for user in users:
            print(f"- {user['email']} | isAdmin: {user['isAdmin']} | role: {user['role']}")

def make_admin(email):
    with app.app_context():
        user_doc = User.find_by_email(email)
        if not user_doc:
            print(f"Error: User with email '{email}' not found.")
            return
            
        User.update_by_id(str(user_doc['_id']), {"isAdmin": True, "role": "admin"})
        print(f"Success: User '{email}' is now an admin.")

def create_test_admin():
    """Creates a default admin user for testing."""
    with app.app_context():
        email = "admin@test.com"
        if User.find_by_email(email):
            print(f"User '{email}' already exists.")
            return
            
        User.create(
            username='admin',
            email=email,
            password='password123',
            name='Admin User',
            isAdmin=True,
            role='admin'
        )
        print(f"Successfully created admin user: {email} with password: password123")

def show_help():
    print("\nPhishXray Management Script (MongoDB)")
    print("Usage: python manage.py [command] [options]")
    print("\nCommands:")
    print("  list_users          List all registered users.")
    print("  make_admin <email>  Promote a user to admin.")
    print("  create_admin        Create a default test admin user.")
    print("\n")

if __name__ == '__main__':
    # This ensures the script is run within the application context
    with app.app_context():
        if len(sys.argv) < 2:
            show_help()
            sys.exit(1)

        command = sys.argv[1]

        if command == 'list_users':
            list_users()
        elif command == 'make_admin':
            if len(sys.argv) < 3:
                print("Error: Please provide an email address.")
                show_help()
            else:
                make_admin(sys.argv[2])
        elif command == 'create_admin':
            create_test_admin()
        else:
            print(f"Error: Unknown command '{command}'")
            show_help()