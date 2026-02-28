# -*- coding: utf-8 -*-
"""
API routes dla wirtualnego asystenta AI
Obsługuje polskie znaki: ą, ć, ę, ł, ń, ó, ś, ź, ż
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from assistant_ai import AssistantManager
from db import DatabaseHelper
import json
from typing import Optional

assistant_bp = Blueprint('assistant', __name__)


def log_assistant_action(id_uzytkownika: int, action: str, details: Optional[dict] = None):
    """
    Pomocnicza funkcja do logowania akcji asystenta
    
    Args:
        id_uzytkownika: ID użytkownika
        action: Typ akcji
        details: Szczegóły akcji (opcjonalne)
    """
    try:
        # Pobierz status użytkownika
        user_query = "SELECT status FROM uzytkownicy WHERE id_uzytkownika = :user_id"
        user_data = DatabaseHelper.fetch_one(user_query, {'user_id': id_uzytkownika})
        user_status = user_data['status'] if user_data else 'unknown'
        
        # Zapisz log
        log_query = """
        INSERT INTO logi (id_uzytkownika, timestamp, action, user_status_at_log, details)
        VALUES (:user_id, NOW(), :action, :status, :details)
        """
        DatabaseHelper.execute(log_query, {
            'user_id': id_uzytkownika,
            'action': action,
            'status': user_status,
            'details': json.dumps(details, ensure_ascii=False) if details else None
        })
    except Exception as e:
        current_app.logger.error(f"Error logging assistant action: {e}")


@assistant_bp.route('/assistant/chat', methods=['POST'])
@jwt_required()
def chat():
    """
    Endpoint do komunikacji z asystentem AI
    
    Request Body:
    {
        "message": "Jakie były moje wydatki dzisiaj?",
        "context": {}  # opcjonalny dodatkowy kontekst
    }
    
    Response:
    {
        "success": true,
        "response": "Dzisiaj wydałeś 150,50 PLN na 3 zakupy...",
        "intent": "get_expenses",
        "data": [...],
        "timestamp": "2025-10-12T10:30:00"
    }
    """
    try:
        # Pobierz dane użytkownika
        sesja = get_jwt_identity()
        id_uzytkownika = sesja['id_uzytkownika']
        api_key = sesja.get('apiKlucz')
        
        # Sprawdź czy API key istnieje
        if not api_key or len(api_key) < 10:
            # Fallback do klucza z konfiguracji (ustaw GEMINI_API_KEY w .env)
            api_key = current_app.config.get('GEMINI_API_KEY')
        
        # Pobierz wiadomość od użytkownika
        data = request.get_json()
        message = data.get('message', '').strip()
        context = data.get('context', {})
        
        if not message:
            return jsonify({
                "success": False,
                "error": "Brak wiadomości w zapytaniu"
            }), 400
        
        # Pobierz lub utwórz instancję asystenta
        assistant = AssistantManager.get_or_create_assistant(id_uzytkownika, api_key)
        
        # Przetwórz wiadomość
        result = assistant.process_message(message, context)
        
        # Log aktywności użytkownika
        log_assistant_action(
            id_uzytkownika,
            "assistant_query",
            {
                "message": message[:100],  # Pierwsze 100 znaków
                "intent": result.get('intent'),
                "success": result.get('success'),
                "timestamp": result.get('timestamp')
            }
        )
        
        return jsonify(result), 200 if result['success'] else 500
        
    except Exception as e:
        current_app.logger.error(f"Error in assistant chat: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Wystąpił błąd podczas przetwarzania zapytania"
        }), 500


@assistant_bp.route('/assistant/history', methods=['GET'])
@jwt_required()
def get_history():
    """
    Pobiera historię rozmowy użytkownika z asystentem
    
    Response:
    {
        "success": true,
        "history": [
            {
                "role": "user",
                "parts": ["Jakie były moje wydatki dzisiaj?"]
            },
            {
                "role": "model",
                "parts": ["Dzisiaj wydałeś..."]
            }
        ],
        "count": 10
    }
    """
    try:
        sesja = get_jwt_identity()
        id_uzytkownika = sesja['id_uzytkownika']
        api_key = sesja.get('apiKlucz') or current_app.config.get('GEMINI_API_KEY')
        
        # Pobierz asystenta (jeśli istnieje)
        assistant = AssistantManager.get_or_create_assistant(id_uzytkownika, api_key)
        history = assistant.get_conversation_history()
        
        return jsonify({
            "success": True,
            "history": history,
            "count": len(history)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting assistant history: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@assistant_bp.route('/assistant/clear', methods=['POST'])
@jwt_required()
def clear_conversation():
    """
    Czyści historię rozmowy użytkownika
    
    Response:
    {
        "success": true,
        "message": "Historia rozmowy została wyczyszczona"
    }
    """
    try:
        sesja = get_jwt_identity()
        id_uzytkownika = sesja['id_uzytkownika']
        
        # Zresetuj rozmowę
        AssistantManager.reset_conversation(id_uzytkownika)
        
        # Log aktywności
        log_assistant_action(id_uzytkownika, "assistant_clear_history")
        
        return jsonify({
            "success": True,
            "message": "Historia rozmowy została wyczyszczona"
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error clearing assistant history: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@assistant_bp.route('/assistant/session/end', methods=['POST'])
@jwt_required()
def end_session():
    """
    Kończy sesję asystenta i usuwa ją z pamięci
    
    Response:
    {
        "success": true,
        "message": "Sesja asystenta została zakończona"
    }
    """
    try:
        sesja = get_jwt_identity()
        id_uzytkownika = sesja['id_uzytkownika']
        
        # Usuń sesję
        AssistantManager.clear_session(id_uzytkownika)
        
        return jsonify({
            "success": True,
            "message": "Sesja asystenta została zakończona"
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error ending assistant session: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@assistant_bp.route('/assistant/capabilities', methods=['GET'])
@jwt_required()
def get_capabilities():
    """
    Zwraca listę możliwości asystenta
    
    Response:
    {
        "success": true,
        "capabilities": [
            {
                "name": "get_expenses_by_date",
                "description": "Pobiera wydatki z okresu",
                "examples": [...]
            }
        ]
    }
    """
    try:
        from assistant_ai.tools import get_tools_definition
        
        capabilities = []
        for tool in get_tools_definition():
            capabilities.append({
                "name": tool['name'],
                "description": tool['description'],
                "parameters": tool['parameters']
            })
        
        # Dodaj przykłady zapytań
        examples = [
            "Jakie były moje wydatki dzisiaj?",
            "Ile wydałem na jedzenie w tym miesiącu?",
            "Pokaż moje zakupy w Biedronce",
            "Jak wygląda mój budżet?",
            "Jakie są moje najdroższe zakupy w tym tygodniu?",
            "Historia cen mleka",
            "W jakich sklepach najczęściej robię zakupy?",
            "Porównaj moje wydatki z tego i zeszłego miesiąca",
            "Ustaw limit 300 PLN na Jedzenie",
            "Stwórz listę zakupów",
            "Dodaj mleko i chleb do listy"
        ]
        
        return jsonify({
            "success": True,
            "capabilities": capabilities,
            "example_queries": examples,
            "supported_languages": ["pl"],
            "model": "gemini-2.5-flash-lite"
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting assistant capabilities: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@assistant_bp.route('/assistant/health', methods=['GET'])
@jwt_required()
def health_check():
    """
    Sprawdza status asystenta
    
    Response:
    {
        "success": true,
        "status": "online",
        "active_sessions": 5
    }
    """
    try:
        session_count = len(AssistantManager._sessions)
        
        return jsonify({
            "success": True,
            "status": "online",
            "active_sessions": session_count,
            "model": "gemini-2.5-flash-lite"
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error checking assistant health: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
