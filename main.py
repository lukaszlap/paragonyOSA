# -*- coding: utf-8 -*-
"""
Główny plik aplikacji Flask
Obsługuje polskie znaki: ą, ć, ę, ł, ń, ó, ś, ź, ż
"""
from flask import Flask, render_template, send_from_directory
from PIL import Image
from routes.auth import auth_bp
from routes.api import api_bp
from routes.assistant import assistant_bp
from flask_jwt_extended import JWTManager, create_access_token, jwt_required
import cryptography
import ssl
from datetime import timedelta
from ekstrakcja import Ekstrakcja
from flask_cors import CORS
from config import get_config
from db import db

# Initialize Flask app with template and static folders
app = Flask(__name__, 
            template_folder='templates',
            static_folder='static')

# Load configuration
config = get_config()
app.config.from_object(config)

# Configure JSON encoding for Polish characters (ą, ć, ę, ł, ń, ó, ś, ź, ż)
app.config['JSON_AS_ASCII'] = False
app.config['JSON_SORT_KEYS'] = False
app.config['JSONIFY_MIMETYPE'] = 'application/json; charset=utf-8'

# Enable CORS for all routes - Simple configuration
CORS(app, origins=app.config['CORS_ORIGINS'], supports_credentials=True, allow_headers=["Content-Type", "Authorization"])

# Initialize extensions
db.init_app(app)
jwt = JWTManager(app)

# Rejestracja blueprintów
app.register_blueprint(auth_bp, url_prefix='/')
# CaleAPI
app.register_blueprint(api_bp, url_prefix='/')
# Virtual Assistant API
app.register_blueprint(assistant_bp, url_prefix='/')
Ekstrakcja.init_app(app)

# ============================================================================
# Frontend Routes - Hostowanie aplikacji SPA
# ============================================================================

@app.route('/')
def index():
    """Strona główna - landing page (main.html)"""
    return render_template('main.html')

@app.route('/app')
def app_page():
    """Główna aplikacja SPA (index.html)"""
    return render_template('index.html')

@app.route('/static/<path:filename>')
def serve_static(filename):
    """Serwowanie plików statycznych (JS, CSS, images, etc.)"""
    static_folder = app.static_folder or 'static'
    return send_from_directory(static_folder, filename)

# Fallback dla routingu SPA - wszystkie nieznane ścieżki przekieruj do app
@app.route('/<path:path>')
def catch_all(path):
    """
    Catch-all route dla SPA routing.
    Jeśli ścieżka nie jest endpointem API, zwróć index.html.
    """
    # Lista wszystkich znanych prefiksów API (bez blueprints prefix, bo są zarejestrowane pod '/')
    api_endpoints = [
        'auth',  # auth prefix for register/login
        'register', 'login', 'verify', 'addKey', 'ZmienHaslo', 'logout',  # auth
        'paragony', 'paragon', 'paragonUpdate', 'paragonDelete',  # receipts
        'produkty', 'produktyUpdate', 'produktDelete', 'produktyDlaParagonu',  # products
        'produktyzkategorii', 'produktyHistoriaCen', 'pobierzInformacjeOProdukcie',
        'pobierzKategorie', 'pobierzMiasta', 'pobierzFirmy',  # reference data
        'limit', 'dodajlimit', 'limitUpdate', 'limitDelete',  # limits
        'powiadomienia', 'dodaj_powiadomienie',  # notifications
        'logi',  # logs
        'raport', 'raport_z_filtrem', 'raportWydatkowKategorieMiesiace',  # reports
        'utworzListe', 'pobierzListy', 'pobierzZawartoscListy', 'usunListe',  # shopping lists
        'wyszukiwaniesklepu', 'paragonyPokazPoFirmie',  # search
        'PobierzSugestieDania', 'UtworzPrzepisDania', 'AnalizaZdrowotosciPosilku',  # AI features
        'RekomendacjeSezonowosci',
        'assistant',  # assistant routes
        'analyze-receipt'  # receipt analysis
    ]
    
    # Sprawdź, czy ścieżka zaczyna się od znanego endpointu API
    first_segment = path.split('/')[0]
    if first_segment in api_endpoints:
        # To jest endpoint API, ale nie został znaleziony - zwróć 404
        return {'status': 'error', 'message': 'Endpoint not found'}, 404
    
    # Dla innych ścieżek zwróć SPA (index.html)
    # Frontend router (app.js) obsłuży routing po stronie klienta
    return render_template('index.html')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
    #app.run(ssl_context='adhoc', host='0.0.0.0', port=5000, debug=True)
    #app.run(ssl_context='adhoc', host='0.0.0.0')
    #app.run(ssl_context='adhoc', port=443)
    