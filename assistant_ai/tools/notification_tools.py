# -*- coding: utf-8 -*-
"""
Funkcje narzędzi związanych z powiadomieniami użytkownika
"""

from typing import Dict, Optional
from db import DatabaseHelper


class NotificationTools:
    """Klasa grupująca narzędzia do zarządzania powiadomieniami"""
    
    def __init__(self, user_id: int):
        """
        Inicjalizacja narzędzi powiadomień
        
        Args:
            user_id: ID użytkownika
        """
        self.user_id = user_id
    
    def get_notifications(self, unread_only: bool = False, limit: int = 20) -> Dict:
        """
        Pobiera powiadomienia użytkownika
        
        Args:
            unread_only: Czy pokazać tylko nieprzeczytane (opcjonalne)
            limit: Maksymalna liczba wyników
            
        Returns:
            Dict z powiadomieniami
        """
        if limit is None or limit <= 0:
            limit = 20
        
        query = """
        SELECT 
            p.id_powiadomienia,
            p.tresc,
            p.data_utworzenia,
            l.limity as limit_kwota,
            k.nazwa as kategoria
        FROM powiadomienia p
        LEFT JOIN limity l ON p.id_limitu = l.id
        LEFT JOIN kategorie k ON l.id_kategorii = k.id_kategorii
        WHERE p.id_uzytkownika = :user_id
        ORDER BY p.data_utworzenia DESC
        LIMIT :limit
        """
        
        results = DatabaseHelper.fetch_all(query, {
            'user_id': self.user_id,
            'limit': limit
        })
        
        return {
            'success': True,
            'notifications': results,
            'count': len(results)
        }
    
    def get_budget_alerts(self) -> Dict:
        """
        Pobiera alerty budżetowe - kategorie które przekroczyły lub zbliżają się do limitu
        
        Returns:
            Dict z alertami budżetowymi
        """
        query = """
        SELECT 
            k.nazwa as kategoria,
            l.limity as limit_kwota,
            COALESCE(SUM(pr.cena), 0) as wydano,
            l.limity - COALESCE(SUM(pr.cena), 0) as pozostalo,
            ROUND((COALESCE(SUM(pr.cena), 0) / l.limity * 100), 2) as procent_wykorzystania,
            CASE 
                WHEN COALESCE(SUM(pr.cena), 0) >= l.limity THEN 'exceeded'
                WHEN COALESCE(SUM(pr.cena), 0) >= l.limity * 0.75 THEN 'warning'
                ELSE 'ok'
            END as status
        FROM limity l
        JOIN kategorie k ON l.id_kategorii = k.id_kategorii
        LEFT JOIN produkty pr ON pr.id_kategorii = k.id_kategorii
        LEFT JOIN paragony p ON pr.id_paragonu = p.id_paragonu 
            AND p.id_uzytkownika = l.id_uzytkownika
            AND MONTH(p.data_dodania) = MONTH(CURRENT_DATE())
            AND YEAR(p.data_dodania) = YEAR(CURRENT_DATE())
        WHERE l.id_uzytkownika = :user_id
        GROUP BY k.nazwa, l.limity
        HAVING status != 'ok'
        ORDER BY procent_wykorzystania DESC
        """
        
        alerts = DatabaseHelper.fetch_all(query, {'user_id': self.user_id})
        
        # Kategoryzuj alerty
        exceeded = [a for a in alerts if a.get('status') == 'exceeded']
        warnings = [a for a in alerts if a.get('status') == 'warning']
        
        return {
            'success': True,
            'alerts': alerts,
            'exceeded': exceeded,
            'warnings': warnings,
            'total_alerts': len(alerts),
            'message': self._generate_alert_message(exceeded, warnings)
        }
    
    def _generate_alert_message(self, exceeded: list, warnings: list) -> str:
        """Generuje przyjazną wiadomość o alertach"""
        messages = []
        
        if exceeded:
            categories = ', '.join([a['kategoria'] for a in exceeded])
            messages.append(f"🚨 Przekroczono limit w kategoriach: {categories}")
        
        if warnings:
            categories = ', '.join([a['kategoria'] for a in warnings])
            messages.append(f"⚠️ Zbliżasz się do limitu w kategoriach: {categories}")
        
        if not messages:
            return "✅ Wszystkie limity budżetowe pod kontrolą!"
        
        return " | ".join(messages)
