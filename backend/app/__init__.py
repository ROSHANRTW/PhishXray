# app/__init__.py

import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

# Apne mongo_client se mongo instance import karenge
from .mongo_client import mongo

# Environment variables load karenge .env file se
load_dotenv()

def create_app():
    """Construct the core application."""
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('JWT_SECRET', 'dev_secret')
    app.config["MONGO_URI"] = os.getenv('DATABASE_URL', 'mongodb://localhost:27017/phishxray')

    # Initialize extensions
    mongo.init_app(app)
    
    # CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    with app.app_context():
        # Import and register blueprints (routes)
        from .routes.auth import auth_blueprint
        from .routes.admin import admin_blueprint
        from .routes.scan import scan_blueprint
        
        app.register_blueprint(auth_blueprint, url_prefix='/api/auth')
        app.register_blueprint(admin_blueprint, url_prefix='/api/admin')
        app.register_blueprint(scan_blueprint, url_prefix='/api/scan')

        # Root route
        @app.route('/')
        def index():
            return {"success": True, "message": "🚀 PhishXray Python API is running on MongoDB!"}

        # favicon.ico ke 404 error ko rokne ke liye
        @app.route('/favicon.ico')
        def favicon():
            return '', 204

        return app