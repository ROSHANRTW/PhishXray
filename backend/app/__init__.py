# app/__init__.py
import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from .mongo_client import mongo

load_dotenv()

def create_app():
    app = Flask(__name__)
    
    app.config['SECRET_KEY'] = os.getenv('JWT_SECRET', 'dev_secret')
    app.config["MONGO_URI"] = os.getenv('DATABASE_URL', 'mongodb://localhost:27017/phishxray')

    mongo.init_app(app)
    
    # CORS — wildcard for all vercel deployments
    CORS(app,
         resources={r"/api/*": {"origins": "*"}},
         supports_credentials=False,
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )

    with app.app_context():
        from .routes.auth import auth_blueprint
        from .routes.admin import admin_blueprint
        from .routes.scan import scan_blueprint
        
        app.register_blueprint(auth_blueprint, url_prefix='/api/auth')
        app.register_blueprint(admin_blueprint, url_prefix='/api/admin')
        app.register_blueprint(scan_blueprint, url_prefix='/api/scan')

        @app.route('/')
        def index():
            return {"success": True, "message": "PhishXray API is running!"}

        @app.route('/favicon.ico')
        def favicon():
            return '', 204

        return app