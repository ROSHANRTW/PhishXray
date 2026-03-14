# -*- coding: utf-8 -*-
"""
Entry point to run the Flask application.
"""
import os
from app import create_app

app = create_app()

if __name__ == '__main__':
    # Flask development server ko start karega
    # Port .env file se aayega ya default 8080 hoga
    port = int(os.getenv('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=True)