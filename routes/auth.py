from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from db import DatabaseHelper
import bcrypt
import ssl
import os
import json
import re

auth_bp = Blueprint('auth', __name__)
revoked_tokens = set()


def log_user_action(user_id, action, user_status, details=None):
    """Store a single audit log entry."""
    DatabaseHelper.execute(
        """
        INSERT INTO logi (id_uzytkownika, action, user_status_at_log, details)
        VALUES (:user_id, :action, :status, :details)
        """,
        {
            "user_id": user_id,
            "action": action,
            "status": user_status,
            "details": details,
        },
    )


def get_user_status(user_id):
    """Fetch latest user status for logging."""
    record = DatabaseHelper.fetch_one(
        "SELECT status FROM uzytkownicy WHERE id_uzytkownika = :user_id",
        {"user_id": user_id},
    )
    return record.get("status", "unknown") if record else "unknown"

@auth_bp.route('/auth/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        try:
            data = request.json
            email = data['login']
            password = data['password']
            imie = data['imie']
            print(email, imie, password)
            
            if not email or not re.match(r"[^@]+@[^@]+\.[^@]+", email):
                return jsonify({"message": "Nieprawidłowy format adresu e-mail."}), 400
            
            if not password or len(password) < 8 or not re.search(r"[A-Z]", password) or not re.search(r"[a-z]", password) or not re.search(r"\d", password) or not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
                return jsonify({"message":"Hasło musi mieć co najmniej 8 znaków i zawierać wielkie i małe litery, cyfry oraz znaki specjalne"}), 400

            if not imie or len(imie) < 2:
                return jsonify({"message":"Sprawdź poprawność imienia. (nie może być pusta)"}), 400
            
            # Check if user already exists
            result = DatabaseHelper.fetch_one(
                "SELECT * FROM uzytkownicy WHERE email = :email", 
                {"email": email}
            )
            if result:
                return jsonify({"message":"Użytkownik o podanym adresie e-mail już istnieje."}), 400

            haslo_hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

            # Insert new user and get the ID
            user_id = DatabaseHelper.execute(
                """
                INSERT INTO uzytkownicy (email, password, imie, status, google_id)
                VALUES (:email, :password, :imie, :status, :google_id)
                """,
                {
                    "email": email,
                    "password": haslo_hashed,
                    "imie": imie,
                    "status": "default",
                    "google_id": None,
                },
                return_lastrowid=True
            )
            
            # Log the registration only if user was created successfully
            if user_id and user_id > 0:
                log_user_action(user_id, "register", "default", json.dumps({"email": email}))
            
            print('Zarejestrowano pomyślnie')
            return jsonify({"success": True}), 201
        except Exception as e:
            print(e)
            DatabaseHelper.rollback()
            return jsonify({"error": str(e)}), 500
    print('Invalid request')
    return jsonify({"error": "Invalid request"}), 400

@auth_bp.route('/auth/login', methods=['POST'])
def login():
    kluczDoGemini = ''
    kluczJest = False
    if request.method == 'POST':
        data = request.get_json() 
        print(data)
        if not data:
            return jsonify({"message": "Brak danych JSON w żądaniu"}), 400

        email = data['login']
        password = data['password']
        print(email, password)
        try:
            result = DatabaseHelper.fetch_one(
                "SELECT * FROM uzytkownicy WHERE email = :email",
                {"email": email}
            )

            if result:
                print(f"DEBUG: User found: {result['email']}")
                print(f"DEBUG: Password type: {type(result['password'])}")
                print(f"DEBUG: Password value (first 20 chars): {str(result['password'])[:20]}")
                
                # Password from database is already bytes, no need to encode
                password_hash = result['password']
                if isinstance(password_hash, str):
                    password_hash = password_hash.encode('utf-8')
                
                if bcrypt.checkpw(password.encode('utf-8'), password_hash):
                    if result['apiKlucz'] is not None and len(result['apiKlucz']) > 10:
                        kluczDoGemini = result['apiKlucz']
                        kluczJest = True
                    access_token = create_access_token(identity={'id_uzytkownika': result['id_uzytkownika'], 'email': email, 'imie': result['imie'], 'apiKlucz': kluczDoGemini})
                    session['user'] = result['id_uzytkownika']
                    session['zalogowany'] = True
                    log_user_action(
                        result['id_uzytkownika'],
                        "login",
                        result.get('status', 'unknown'),
                        json.dumps({"email": email}),
                    )
                    print(session)
                    print(result['imie'])
                    print(access_token)
                    return jsonify({
                        "success": True,
                        "id_uzytkownika": result['id_uzytkownika'],
                        "login": email, 
                        "imie": result['imie'], 
                        "access_token": access_token,
                        "klucz": kluczJest
                        }), 200
                else:
                    print("DEBUG: Password check failed - incorrect password")
                    return jsonify({"message": "Złe dane."}), 401
            else:
                print("DEBUG: User not found")
                return jsonify({"message": "Złe dane."}), 401
        except Exception as e:
            print("Błąd:", e)
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

@auth_bp.route('/verify', methods=['GET', 'POST'])
@jwt_required()
def verify():
    current_user = get_jwt_identity()
    if get_jwt()["jti"] in revoked_tokens:
        return jsonify({"error": "Token has been revoked"}), 401
    log_user_action(
        current_user['id_uzytkownika'],
        "verify",
        get_user_status(current_user['id_uzytkownika']),
    )
    return jsonify({"success": True, "id_uzytkownika": current_user['id_uzytkownika']}), 200

@auth_bp.route('/addKey', methods=['GET'])
@jwt_required()
def addKey():
    current_user = get_jwt_identity()
    user_id = current_user['id_uzytkownika']
    klucz = request.args.get('klucz')
    print(klucz)
    try:
        DatabaseHelper.execute(
            "UPDATE uzytkownicy SET apiKlucz = :klucz WHERE id_uzytkownika = :user_id",
            {"klucz": klucz, "user_id": user_id}
        )
        log_user_action(
            user_id,
            "add_key",
            get_user_status(user_id),
            json.dumps({"has_key": bool(klucz)}),
        )
        return jsonify({"success": True, "message": "Klucz został dodany."}), 200
    except Exception as e:
        print(e)
        DatabaseHelper.rollback()
        return jsonify({"error": str(e)}), 500
        

@auth_bp.route('/ZmienHaslo', methods=['POST'])
@jwt_required()
def zmien_haslo():
    current_user = get_jwt_identity()
    user_id = current_user['id_uzytkownika']

    try:
        data = request.json
        new_password = data.get('newPassword')
        confirm_password = data.get('confirmPassword')
        if not new_password or len(new_password) < 8 or not re.search(r"[A-Z]", new_password) or not re.search(r"[a-z]", new_password) or not re.search(r"\d", new_password) or not re.search(r"[!@#$%^&*(),.?:{}|<>]", new_password):
            return jsonify({"message": "Hasło musi mieć co najmniej 8 znaków i zawierać wielkie i małe litery, cyfry oraz znaki specjalne"}), 400

        if new_password == confirm_password:
            hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())

            DatabaseHelper.execute(
                "UPDATE uzytkownicy SET password = :password WHERE id_uzytkownika = :user_id",
                {"password": hashed_password, "user_id": user_id}
            )

            jti = get_jwt()["jti"]
            revoked_tokens.add(jti)
            log_user_action(
                user_id,
                "change_password",
                get_user_status(user_id),
            )

            return jsonify({"success": True, "message": "Hasło zostało zmienione."}), 200
        else:
            return jsonify({"message": "Hasła nie są zgodne."}), 400  
           
    except Exception as e:
        print(e)
        DatabaseHelper.rollback()
        return jsonify({"message": str(e)}), 500 

@auth_bp.route('/logout', methods=['GET', 'POST'])
@jwt_required()
def logout():
    jwt_token = get_jwt()
    current_user = get_jwt_identity()
    revoked_tokens.add(jwt_token["jti"])
    session.clear()
    if current_user and isinstance(current_user, dict):
        user_id = current_user.get("id_uzytkownika")
        if user_id:
            log_user_action(user_id, "logout", get_user_status(user_id))
    return jsonify({"success": True}), 200