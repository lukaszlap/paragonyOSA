# -*- coding: utf-8 -*-
"""
Główna logika Wirtualnego Asystenta AI
"""

import google.generativeai as genai
from datetime import datetime
from typing import Dict, List, Any, Optional
import json
import re
import inspect

from .constants import GEMINI_MODEL_NAME, GEMINI_GENERATION_CONFIG
from .tools import get_tools_definition
from .tools.expense_tools import ExpenseTools
from .tools.budget_tools import BudgetTools
from .tools.shopping_list_tools import ShoppingListTools
from .tools.user_logs_tools import UserLogsTools
from .tools.receipt_tools import ReceiptTools
from .tools.notification_tools import NotificationTools
from .tools.product_nutrition_tools import ProductNutritionTools
from .prompts import get_system_prompt
from .intent_analyzer import IntentAnalyzer
from .rag_knowledge import get_rag_knowledge_base


class VirtualAssistant:
    """Klasa zarządzająca wirtualnym asystentem AI"""
    
    def __init__(self, api_key: str, user_id: int):
        """
        Inicjalizacja asystenta
        
        Args:
            api_key: Klucz API do Gemini
            user_id: ID użytkownika
        """
        self.user_id = user_id
        self.api_key = api_key
        
        # Konfiguracja Gemini
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(
            GEMINI_MODEL_NAME,
            generation_config=GEMINI_GENERATION_CONFIG
        )
        
        # Inicjalizacja narzędzi
        self.expense_tools = ExpenseTools(user_id)
        self.budget_tools = BudgetTools(user_id)
        self.shopping_list_tools = ShoppingListTools(user_id)
        self.user_logs_tools = UserLogsTools(user_id)
        self.receipt_tools = ReceiptTools(user_id)
        self.notification_tools = NotificationTools(user_id)
        self.product_nutrition_tools = ProductNutritionTools(user_id)
        
        # Inicjalizacja analizatora intencji
        self.tools_definition = get_tools_definition()
        self.intent_analyzer = IntentAnalyzer(self.model, self.tools_definition)
        
        # Inicjalizacja bazy wiedzy RAG
        self.rag_kb = get_rag_knowledge_base()
        
        # Inicjalizacja czatu - najpierw tworzymy czat, potem dodajemy kontekst systemowy
        self.chat = self.model.start_chat(history=[])
        self._initialize_system_context()
    
    def _initialize_system_context(self):
        """Inicjalizuje kontekst systemowy asystenta - wywoływana RAZ przy starcie"""
        system_prompt = get_system_prompt()
        
        # Wyślij prompt systemowy jako pierwszą wiadomość użytkownika
        # Model Gemini nie ma specjalnego "system message", więc symulujemy to
        try:
            self.chat.send_message(
                f"[INSTRUKCJA SYSTEMOWA - Przeczytaj i zapamiętaj na całą rozmowę]\n\n{system_prompt}\n\n[Odpowiedz krótko: 'Rozumiem, jestem gotowy do pomocy']"
            )
        except Exception as e:
            print(f"Błąd inicjalizacji kontekstu: {e}")
    
    def _check_and_get_rag_context(self, user_message: str) -> str:
        """
        Sprawdza czy zapytanie dotyczy dokumentacji i zwraca kontekst z bazy RAG
        
        Args:
            user_message: Wiadomość użytkownika
            
        Returns:
            Kontekst z bazy wiedzy lub pusty string
        """
        # Słowa kluczowe wskazujące na pytania o system/dokumentację
        doc_keywords = [
            'jak działa', 'jak używać', 'co to jest', 'wyjaśnij',
            'dokumentacja', 'instrukcja', 'pomoc', 'funkcjonalność',
            'architektura', 'api', 'endpoint', 'narzędzia',
            'autor', 'technologia', 'opis systemu', 'jak korzystać'
        ]
        
        # Sprawdź czy pytanie zawiera słowa kluczowe
        message_lower = user_message.lower()
        is_doc_question = any(keyword in message_lower for keyword in doc_keywords)
        
        # Jeśli nie ma bazy RAG lub to nie jest pytanie o dokumentację, zwróć pusty string
        if not self.rag_kb.is_available() or not is_doc_question:
            return ""
        
        # Pobierz kontekst z bazy RAG (max 2000 znaków aby nie zapełnić kontekstu)
        rag_context = self.rag_kb.get_context_for_query(user_message, max_tokens=500)
        
        return rag_context
    
    def process_message(self, user_message: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Przetwarza wiadomość użytkownika i zwraca odpowiedź
        UŻYWA self.chat do utrzymania kontekstu rozmowy
        
        Args:
            user_message: Wiadomość od użytkownika
            context: Dodatkowy kontekst (opcjonalny)
            
        Returns:
            Dict z odpowiedzią i metadanymi
        """
        try:
            # Sprawdź czy pytanie dotyczy dokumentacji/systemu
            rag_context = self._check_and_get_rag_context(user_message)
            
            # Analiza intencji i ekstrakcja parametrów
            intent_data = self.intent_analyzer.analyze_intent(user_message)
            
            # Wykonaj odpowiednie funkcje jeśli potrzebne
            function_results = []
            if intent_data.get('functions'):
                for func_call in intent_data['functions']:
                    result = self._execute_function(
                        func_call['name'],
                        func_call['parameters']
                    )
                    function_results.append({
                        'function': func_call['name'],
                        'data': result
                    })
            
            # Przygotuj wiadomość z kontekstem dla modelu
            context_parts = []
            
            # Dodaj kontekst RAG jeśli jest dostępny
            if rag_context:
                context_parts.append(rag_context)
            
            # Dodaj wiadomość użytkownika
            context_parts.append(user_message)
            
            # Dodaj dane z funkcji jeśli są
            if function_results:
                context_parts.append("\n\n[DANE Z BAZY - Przetłumacz to na piękny Markdown dla użytkownika]")
                
                for result in function_results:
                    context_parts.append(f"\nWynik funkcji {result['function']}:")
                    context_parts.append(json.dumps(result['data'], ensure_ascii=False, indent=2))
                
                context_parts.append("\n[KONIEC DANYCH - Pamiętaj: Użytkownik NIE widzi JSON. Sformatuj to ładnie!]")
            
            full_message = "\n".join(context_parts)
            
            # Użyj self.chat.send_message - automatycznie zachowuje historię
            response = self.chat.send_message(full_message)
            response_text = response.text.strip()
            
            # Usuń ewentualne znaczniki systemowe z odpowiedzi (failsafe)
            response_text = re.sub(r'\[SYSTEM DATA.*?\]', '', response_text, flags=re.DOTALL)
            response_text = re.sub(r'\[DANE Z BAZY.*?\]', '', response_text, flags=re.DOTALL)
            response_text = re.sub(r'Function:\s*\w+', '', response_text)
            response_text = re.sub(r'Result:\s*\{', '{', response_text)
            
            return {
                "success": True,
                "response": response_text.strip(),
                "intent": intent_data.get('intent', 'unknown'),
                "data": function_results,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            error_msg = f"Przepraszam, wystąpił błąd podczas przetwarzania Twojego zapytania: {str(e)}"
            return {
                "success": False,
                "response": error_msg,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def _execute_function(self, function_name: str, parameters: Dict) -> Any:
        """
        Wykonuje funkcję bazodanową
        
        Args:
            function_name: Nazwa funkcji
            parameters: Parametry funkcji
            
        Returns:
            Wynik funkcji
        """
        # Mapowanie nazw funkcji na metody narzędzi
        function_map = {
            # Expense tools
            'get_expenses_by_date': self.expense_tools.get_expenses_by_date,
            'get_expenses_by_category': self.expense_tools.get_expenses_by_category,
            'get_expenses_by_store': self.expense_tools.get_expenses_by_store,
            'get_spending_summary': self.expense_tools.get_spending_summary,
            'get_product_history': self.expense_tools.get_product_history,
            'get_most_expensive_purchases': self.expense_tools.get_most_expensive_purchases,
            'get_shopping_frequency': self.expense_tools.get_shopping_frequency,
            'compare_periods': self.expense_tools.compare_periods,
            'get_top_stores': self.expense_tools.get_top_stores,
            'get_category_breakdown': self.expense_tools.get_category_breakdown,
            'get_monthly_trends': self.expense_tools.get_monthly_trends,
            'get_spending_patterns': self.expense_tools.get_spending_patterns,
            # Budget tools
            'get_budget_status': self.budget_tools.get_budget_status,
            'manage_budget_limits': self.budget_tools.manage_budget_limits,
            # Shopping list tools
            'manage_shopping_list': self.shopping_list_tools.manage_shopping_list,
            # User logs tools
            'get_user_logs': self.user_logs_tools.get_user_logs,
            # Receipt tools
            'get_receipt_details': self.receipt_tools.get_receipt_details,
            'search_receipts': self.receipt_tools.search_receipts,
            'get_recent_receipts': self.receipt_tools.get_recent_receipts,
            'get_receipt_statistics': self.receipt_tools.get_receipt_statistics,
            # Notification tools
            'get_notifications': self.notification_tools.get_notifications,
            'get_budget_alerts': self.notification_tools.get_budget_alerts,
            # Product nutrition tools
            'get_product_nutrition': self.product_nutrition_tools.get_product_nutrition,
            'search_products_by_nutrition': self.product_nutrition_tools.search_products_by_nutrition,
            'get_nutrition_summary': self.product_nutrition_tools.get_nutrition_summary
        }
        
        func = function_map.get(function_name)
        if func:
            # Filtruj parametry - usuń te, które nie są akceptowane przez funkcję
            func_signature = inspect.signature(func)
            valid_params = set(func_signature.parameters.keys()) - {'self'}
            
            # Zostaw tylko prawidłowe parametry
            filtered_params = {k: v for k, v in parameters.items() if k in valid_params}
            
            # Loguj jeśli usunięto jakieś parametry
            removed_params = set(parameters.keys()) - set(filtered_params.keys())
            if removed_params:
                print(f"UWAGA: Usunięto nieprawidłowe parametry dla {function_name}: {removed_params}")
            
            try:
                return func(**filtered_params)
            except TypeError as e:
                # Loguj błąd parametrów
                print(f"Błąd wywołania funkcji {function_name}: {e}")
                print(f"Parametry: {filtered_params}")
                print(f"Oczekiwane parametry: {list(valid_params)}")
                return {
                    "error": f"Błędne parametry dla funkcji {function_name}",
                    "details": str(e),
                    "provided_parameters": list(filtered_params.keys()),
                    "expected_parameters": list(valid_params)
                }
        else:
            return {"error": f"Unknown function: {function_name}"}
    
    def get_conversation_history(self) -> List[Dict]:
        """Zwraca historię rozmowy z self.chat w czytelnym formacie"""
        history = []
        for message in self.chat.history:
            history.append({
                'role': message.role,
                'content': ' '.join([part.text for part in message.parts if hasattr(part, 'text')])
            })
        return history
    
    def clear_history(self):
        """Czyści historię rozmowy i rozpoczyna nową sesję z nowym promptem systemowym"""
        # Utwórz nowy czat z czystą historią
        self.chat = self.model.start_chat(history=[])
        # Ponownie zainicjalizuj kontekst systemowy
        self._initialize_system_context()


class AssistantManager:
    """Manager do zarządzania sesjami asystenta"""
    
    _sessions = {}
    
    @classmethod
    def get_or_create_assistant(cls, user_id: int, api_key: str) -> VirtualAssistant:
        """
        Pobiera istniejącą lub tworzy nową sesję asystenta
        
        Args:
            user_id: ID użytkownika
            api_key: Klucz API
            
        Returns:
            Instancja VirtualAssistant
        """
        session_key = f"user_{user_id}"
        
        if session_key not in cls._sessions:
            cls._sessions[session_key] = VirtualAssistant(api_key, user_id)
        
        return cls._sessions[session_key]
    
    @classmethod
    def clear_session(cls, user_id: int):
        """Czyści sesję użytkownika"""
        session_key = f"user_{user_id}"
        if session_key in cls._sessions:
            del cls._sessions[session_key]
    
    @classmethod
    def reset_conversation(cls, user_id: int):
        """Resetuje rozmowę użytkownika"""
        session_key = f"user_{user_id}"
        if session_key in cls._sessions:
            cls._sessions[session_key].clear_history()
