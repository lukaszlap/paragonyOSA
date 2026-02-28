# -*- coding: utf-8 -*-
"""
Moduł analizy intencji użytkownika
"""

from datetime import datetime, timedelta
from typing import Dict, Any
import json
import re
import google.generativeai as genai


class IntentAnalyzer:
    """Klasa analizująca intencje użytkownika na podstawie wiadomości"""
    
    def __init__(self, model: genai.GenerativeModel, tools_definition: list):
        """
        Inicjalizacja analizatora intencji
        
        Args:
            model: Model Gemini do analizy
            tools_definition: Definicja dostępnych narzędzi
        """
        self.model = model
        self.tools_definition = tools_definition
    
    def analyze_intent(self, message: str) -> Dict[str, Any]:
        """
        Analizuje intencję użytkownika i wydobywa parametry
        
        Args:
            message: Wiadomość użytkownika
            
        Returns:
            Dict z intencją i parametrami funkcji do wywołania
        """
        # Przygotuj prompt dla analizy intencji z kontekstem historii
        analysis_prompt = f"""Przeanalizuj zapytanie użytkownika w kontekście poprzednich wiadomości:

Dzisiejsza data: {datetime.now().strftime('%Y-%m-%d')}

Zapytanie: "{message}"

Dostępne funkcje:
{json.dumps(self.tools_definition, indent=2, ensure_ascii=False)}

WAŻNE: 
- Pamiętaj o kontekście poprzednich wiadomości! 
- Jeśli użytkownik odnosi się do czegoś wcześniejszego ("to", "ten produkt", "ta kategoria"), 
  użyj informacji z historii rozmowy.
- Interpretuj czas względem dzisiejszej daty:
  * "dzisiaj" = {datetime.now().strftime('%Y-%m-%d')}
  * "wczoraj" = {(datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')}
  * "w tym tygodniu" = ostatnie 7 dni
  * "w tym miesiącu" = bieżący miesiąc

Odpowiedz w formacie JSON:
{{
    "intent": "krótki opis intencji",
    "needs_data": true/false,
    "functions": [
        {{
            "name": "nazwa_funkcji",
            "parameters": {{...}}
        }}
    ]
}}"""
        
        try:
            # Wywołaj model do analizy
            response = self.model.generate_content(analysis_prompt)
            response_text = response.text.strip()
            
            # Wydobądź JSON z odpowiedzi
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                intent_data = json.loads(json_match.group())
                return intent_data
            else:
                # Fallback - prosta analiza
                return self._simple_intent_analysis(message)
                
        except Exception as e:
            print(f"Błąd analizy intencji: {e}")
            return self._simple_intent_analysis(message)
    
    def _simple_intent_analysis(self, message: str) -> Dict[str, Any]:
        """
        Prosta analiza intencji jako fallback
        
        Args:
            message: Wiadomość użytkownika
            
        Returns:
            Dict z podstawową analizą
        """
        message_lower = message.lower()
        today = datetime.now()
        
        intent_data = {
            "intent": "general_query",
            "needs_data": True,
            "functions": []
        }
        
        # Wykrywanie zapytań o wydatki dzisiaj/wczoraj
        if any(word in message_lower for word in ['dzisiaj', 'dziś', 'dzis']):
            date_str = today.strftime('%Y-%m-%d')
            intent_data['functions'].append({
                "name": "get_expenses_by_date",
                "parameters": {
                    "start_date": date_str,
                    "end_date": date_str
                }
            })
        elif 'wczoraj' in message_lower:
            yesterday = (today - timedelta(days=1)).strftime('%Y-%m-%d')
            intent_data['functions'].append({
                "name": "get_expenses_by_date",
                "parameters": {
                    "start_date": yesterday,
                    "end_date": yesterday
                }
            })
        elif any(word in message_lower for word in ['tydzień', 'tydzie', 'tygodniu']):
            week_ago = (today - timedelta(days=7)).strftime('%Y-%m-%d')
            intent_data['functions'].append({
                "name": "get_expenses_by_date",
                "parameters": {
                    "start_date": week_ago,
                    "end_date": today.strftime('%Y-%m-%d')
                }
            })
        elif any(word in message_lower for word in ['miesiąc', 'miesiac', 'miesiącu']):
            month_start = today.replace(day=1).strftime('%Y-%m-%d')
            intent_data['functions'].append({
                "name": "get_expenses_by_date",
                "parameters": {
                    "start_date": month_start,
                    "end_date": today.strftime('%Y-%m-%d')
                }
            })
        
        # Wykrywanie zapytań o budżet/limity
        if any(word in message_lower for word in ['budżet', 'budzet', 'limit', 'limity']):
            intent_data['functions'].append({
                "name": "get_budget_status",
                "parameters": {}
            })
        
        # Wykrywanie zapytań o podsumowanie
        if any(word in message_lower for word in ['podsumowanie', 'suma', 'łącznie', 'lacznie', 'ile wydałem', 'ile wydalem']):
            start_date = (today - timedelta(days=30)).strftime('%Y-%m-%d')
            intent_data['functions'].append({
                "name": "get_spending_summary",
                "parameters": {
                    "start_date": start_date,
                    "end_date": today.strftime('%Y-%m-%d')
                }
            })
        
        # Wykrywanie zapytań o logi/aktywność z nazwą produktu
        if any(word in message_lower for word in ['dodałem', 'dodalem', 'dodawałem', 'dodawalem', 'usunąłem', 'usunalem', 'czy dodałem', 'czy dodalem']):
            # Sprawdź czy pytanie dotyczy konkretnego produktu
            if 'produkt' in message_lower:
                intent_data['functions'].append({
                    "name": "get_user_logs",
                    "parameters": {
                        "action_type": "product_add",
                        "limit": 50
                    }
                })
        
        # Wykrywanie zapytań o logi/aktywność
        elif any(word in message_lower for word in ['aktywność', 'aktywnosc', 'logi', 'historia', 'co robiłem', 'co robilem', 'ostatnie działania', 'ostatnie dzialania']):
            intent_data['functions'].append({
                "name": "get_user_logs",
                "parameters": {
                    "limit": 25
                }
            })
        
        # Wykrywanie zapytań o logowanie
        if any(word in message_lower for word in ['logowanie', 'logowałem', 'logowalem', 'zalogowałem', 'zalogowalem']):
            intent_data['functions'].append({
                "name": "get_user_logs",
                "parameters": {
                    "action_type": "user_login",
                    "limit": 25
                }
            })
        
        return intent_data
