# -*- coding: utf-8 -*-
"""
Funkcje narzędzi związanych z budżetem i limitami wydatków
"""

from typing import Dict, Optional
from db import DatabaseHelper


class BudgetTools:
    """Klasa grupująca narzędzia do zarządzania budżetem"""
    
    def __init__(self, user_id: int):
        """
        Inicjalizacja narzędzi budżetu
        
        Args:
            user_id: ID użytkownika
        """
        self.user_id = user_id
    
    def get_budget_status(self, category: Optional[str] = None) -> Dict:
        """Pobiera status budżetu/limitów"""
        if category:
            query = """
            SELECT 
                k.nazwa as kategoria,
                l.limity as limit_kwota,
                COALESCE(SUM(pr.cena), 0) as wydano,
                l.limity - COALESCE(SUM(pr.cena), 0) as pozostalo
            FROM limity l
            JOIN kategorie k ON l.id_kategorii = k.id_kategorii
            LEFT JOIN produkty pr ON pr.id_kategorii = k.id_kategorii
            LEFT JOIN paragony p ON pr.id_paragonu = p.id_paragonu 
                AND p.id_uzytkownika = l.id_uzytkownika
                AND MONTH(p.data_dodania) = MONTH(CURRENT_DATE())
                AND YEAR(p.data_dodania) = YEAR(CURRENT_DATE())
            WHERE l.id_uzytkownika = :user_id
            AND k.nazwa LIKE :category
            GROUP BY k.nazwa, l.limity
            """
            params = {'user_id': self.user_id, 'category': f"%{category}%"}
        else:
            query = """
            SELECT 
                k.nazwa as kategoria,
                l.limity as limit_kwota,
                COALESCE(SUM(pr.cena), 0) as wydano,
                l.limity - COALESCE(SUM(pr.cena), 0) as pozostalo,
                ROUND((COALESCE(SUM(pr.cena), 0) / l.limity * 100), 2) as procent_wykorzystania
            FROM limity l
            JOIN kategorie k ON l.id_kategorii = k.id_kategorii
            LEFT JOIN produkty pr ON pr.id_kategorii = k.id_kategorii
            LEFT JOIN paragony p ON pr.id_paragonu = p.id_paragonu 
                AND p.id_uzytkownika = l.id_uzytkownika
                AND MONTH(p.data_dodania) = MONTH(CURRENT_DATE())
                AND YEAR(p.data_dodania) = YEAR(CURRENT_DATE())
            WHERE l.id_uzytkownika = :user_id
            GROUP BY k.nazwa, l.limity
            ORDER BY procent_wykorzystania DESC
            """
            params = {'user_id': self.user_id}
        
        results = DatabaseHelper.fetch_all(query, params)
        
        return {
            'budgets': results,
            'count': len(results),
            'period': 'bieżący miesiąc'
        }
    
    def manage_budget_limits(self, action: Optional[str] = None, category: Optional[str] = None, amount: Optional[float] = None) -> Dict:
        """
        Zarządza limitami budżetowymi użytkownika
        
        Args:
            action: Akcja (add/update/delete)
            category: Nazwa kategorii
            amount: Kwota limitu
            
        Returns:
            Dict z wynikiem operacji
        """
        if not action or not category:
            return {
                'success': False,
                'error': 'Wymagane parametry: action i category'
            }
        
        # Pobierz ID kategorii
        category_query = "SELECT id_kategorii FROM kategorie WHERE nazwa LIKE :category LIMIT 1"
        category_result = DatabaseHelper.fetch_one(category_query, {'category': f"%{category}%"})
        
        if not category_result:
            return {
                'success': False,
                'error': f'Nie znaleziono kategorii "{category}"',
                'suggestion': 'Dostępne kategorie: Jedzenie, Napoje, Alkohol, Transport, Odzież, Elektronika, Dom, Sport, Rozrywka, itp.'
            }
        
        category_id = category_result['id_kategorii']
        
        if action == 'add':
            # Konwertuj amount na float i waliduj
            try:
                amount_float = float(amount) if amount is not None else 0
            except (ValueError, TypeError):
                return {
                    'success': False,
                    'error': 'Kwota limitu musi być liczbą'
                }
            
            if amount_float <= 0:
                return {
                    'success': False,
                    'error': 'Wymagana kwota limitu większa niż 0'
                }
            
            # Sprawdź czy limit już istnieje
            check_query = "SELECT id FROM limity WHERE id_uzytkownika = :user_id AND id_kategorii = :category_id"
            existing = DatabaseHelper.fetch_one(check_query, {
                'user_id': self.user_id,
                'category_id': category_id
            })
            
            if existing:
                return {
                    'success': False,
                    'error': f'Limit dla kategorii "{category}" już istnieje',
                    'suggestion': 'Użyj akcji "update" aby go zmienić'
                }
            
            # Dodaj nowy limit
            insert_query = """
            INSERT INTO limity (id_uzytkownika, id_kategorii, limity)
            VALUES (:user_id, :category_id, :amount)
            """
            DatabaseHelper.execute(insert_query, {
                'user_id': self.user_id,
                'category_id': category_id,
                'amount': amount_float
            })
            
            return {
                'success': True,
                'action': 'added',
                'category': category,
                'amount': amount_float,
                'message': f'✅ Dodano limit {amount_float:.2f} PLN dla kategorii "{category}"'
            }
        
        elif action == 'update':
            # Konwertuj amount na float i waliduj
            try:
                amount_float = float(amount) if amount is not None else 0
            except (ValueError, TypeError):
                return {
                    'success': False,
                    'error': 'Kwota limitu musi być liczbą'
                }
            
            if amount_float <= 0:
                return {
                    'success': False,
                    'error': 'Wymagana kwota limitu większa niż 0'
                }
            
            # Zaktualizuj istniejący limit
            update_query = """
            UPDATE limity
            SET limity = :amount
            WHERE id_uzytkownika = :user_id AND id_kategorii = :category_id
            """
            rows_affected = DatabaseHelper.execute(update_query, {
                'user_id': self.user_id,
                'category_id': category_id,
                'amount': amount_float
            })
            
            if rows_affected == 0:
                return {
                    'success': False,
                    'error': f'Nie znaleziono limitu dla kategorii "{category}"',
                    'suggestion': 'Użyj akcji "add" aby go utworzyć'
                }
            
            return {
                'success': True,
                'action': 'updated',
                'category': category,
                'amount': amount_float,
                'message': f'✅ Zaktualizowano limit dla "{category}" na {amount_float:.2f} PLN'
            }
        
        elif action == 'delete':
            # Usuń limit
            delete_query = """
            DELETE FROM limity
            WHERE id_uzytkownika = :user_id AND id_kategorii = :category_id
            """
            rows_affected = DatabaseHelper.execute(delete_query, {
                'user_id': self.user_id,
                'category_id': category_id
            })
            
            if rows_affected == 0:
                return {
                    'success': False,
                    'error': f'Nie znaleziono limitu dla kategorii "{category}"'
                }
            
            return {
                'success': True,
                'action': 'deleted',
                'category': category,
                'message': f'✅ Usunięto limit dla kategorii "{category}"'
            }
        
        else:
            return {
                'success': False,
                'error': f'Nieznana akcja: {action}. Dostępne: add, update, delete'
            }
