# -*- coding: utf-8 -*-
"""
Funkcje narzędzi związanych z logami użytkownika
"""

from typing import Dict, Optional
from db import DatabaseHelper
from ..constants import LOG_ACTIONS


class UserLogsTools:
    """Klasa grupująca narzędzia do przeglądania logów użytkownika"""
    
    def __init__(self, user_id: int):
        """
        Inicjalizacja narzędzi logów
        
        Args:
            user_id: ID użytkownika
        """
        self.user_id = user_id
    
    def get_user_logs(self, start_date: Optional[str] = None, end_date: Optional[str] = None, 
                       action_type: Optional[str] = None, limit: int = 20) -> Dict:
        """
        Pobiera logi aktywności użytkownika
        
        Args:
            start_date: Data początkowa (opcjonalna)
            end_date: Data końcowa (opcjonalna)
            action_type: Typ akcji do filtrowania (opcjonalny) - STRING, nie lista
            limit: Maksymalna liczba wyników
            
        Returns:
            Dict z logami użytkownika
        """
        # Walidacja i wymuszenie wartości domyślnych
        if limit is None or limit <= 0:
            limit = 20
        
        # Upewnij się że limit jest int
        try:
            limit = int(limit)
        except (ValueError, TypeError):
            limit = 20
        
        # Buduj zapytanie dynamicznie
        where_clauses = ["l.id_uzytkownika = :user_id"]
        params = {'user_id': self.user_id, 'limit': limit}
        
        if start_date:
            where_clauses.append("DATE(l.timestamp) >= :start_date")
            params['start_date'] = start_date
        
        if end_date:
            where_clauses.append("DATE(l.timestamp) <= :end_date")
            params['end_date'] = end_date
        
        if action_type:
            # Sprawdź czy action_type jest listą (błąd) czy stringiem
            if isinstance(action_type, list):
                # Jeśli lista, weź pierwszy element lub użyj IN
                if len(action_type) == 1:
                    where_clauses.append("l.action = :action_type")
                    params['action_type'] = action_type[0]
                elif len(action_type) > 1:
                    # Dla wielu wartości użyj IN
                    placeholders = ','.join([f":action_{i}" for i in range(len(action_type))])
                    where_clauses.append(f"l.action IN ({placeholders})")
                    for i, action in enumerate(action_type):
                        params[f'action_{i}'] = action
            elif isinstance(action_type, str) and action_type.strip():
                # Normalny przypadek - pojedynczy niepusty string
                where_clauses.append("l.action = :action_type")
                params['action_type'] = action_type
        
        where_clause = " AND ".join(where_clauses)
        
        query = f"""
        SELECT 
            l.id,
            l.timestamp,
            l.action,
            l.user_status_at_log,
            l.details
        FROM logi l
        WHERE {where_clause}
        ORDER BY l.timestamp DESC
        LIMIT :limit
        """
        
        try:
            results = DatabaseHelper.fetch_all(query, params)
        except Exception as e:
            # Loguj błąd dla debugowania
            print(f"Błąd zapytania SQL w get_user_logs: {e}")
            print(f"Parametry: {params}")
            print(f"Query: {query}")
            return {
                'logs': [],
                'count': 0,
                'action_summary': {},
                'action_descriptions': {},
                'period': f"{start_date or 'początek'} do {end_date or 'teraz'}" if start_date or end_date else "wszystkie",
                'filtered_by_action': action_type,
                'error': str(e)
            }
        
        # Grupuj akcje według typu i dodaj opisy
        action_counts = {}
        action_descriptions = {}
        for log in results:
            action = log['action']
            action_counts[action] = action_counts.get(action, 0) + 1
            if action in LOG_ACTIONS:
                action_descriptions[action] = LOG_ACTIONS[action]
        
        return {
            'logs': results,
            'count': len(results),
            'action_summary': action_counts,
            'action_descriptions': action_descriptions,
            'period': f"{start_date or 'początek'} do {end_date or 'teraz'}" if start_date or end_date else "wszystkie",
            'filtered_by_action': action_type
        }
