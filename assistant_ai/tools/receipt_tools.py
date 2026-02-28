# -*- coding: utf-8 -*-
"""
Funkcje narzędzi związanych z zarządzaniem paragonami
"""

from typing import Dict, Optional
from db import DatabaseHelper


class ReceiptTools:
    """Klasa grupująca narzędzia do zarządzania paragonami"""
    
    def __init__(self, user_id: int):
        """
        Inicjalizacja narzędzi paragonów
        
        Args:
            user_id: ID użytkownika
        """
        self.user_id = user_id
    
    def get_receipt_details(self, receipt_id: Optional[int] = None) -> Dict:
        """
        Pobiera szczegóły paragonu wraz z produktami
        
        Args:
            receipt_id: ID paragonu
            
        Returns:
            Dict ze szczegółami paragonu i listą produktów
        """
        if not receipt_id:
            return {
                'success': False,
                'error': 'Wymagane ID paragonu'
            }
        
        # Pobierz podstawowe dane paragonu
        receipt_query = """
        SELECT 
            p.id_paragonu,
            p.data_dodania,
            p.suma,
            p.sumaZOperacji,
            p.rabat,
            p.opis,
            p.ulica,
            f.nazwa as sklep,
            m.nazwa as miasto,
            m.kod_pocztowy
        FROM paragony p
        LEFT JOIN firmy f ON p.id_firmy = f.id_firmy
        LEFT JOIN miasta m ON p.id_miasta = m.id_miasta
        WHERE p.id_paragonu = :receipt_id AND p.id_uzytkownika = :user_id
        """
        
        receipt = DatabaseHelper.fetch_one(receipt_query, {
            'receipt_id': receipt_id,
            'user_id': self.user_id
        })
        
        if not receipt:
            return {
                'success': False,
                'error': f'Nie znaleziono paragonu o ID {receipt_id}'
            }
        
        # Pobierz produkty z tego paragonu
        products_query = """
        SELECT 
            pr.id_produktu,
            pr.nazwa,
            pr.cena,
            pr.cenajednostkowa,
            pr.ilosc,
            pr.jednostka,
            pr.opis,
            pr.typ_podatku,
            k.nazwa as kategoria
        FROM produkty pr
        LEFT JOIN kategorie k ON pr.id_kategorii = k.id_kategorii
        WHERE pr.id_paragonu = :receipt_id
        ORDER BY pr.id_produktu
        """
        
        products = DatabaseHelper.fetch_all(products_query, {
            'receipt_id': receipt_id
        })
        
        return {
            'success': True,
            'receipt': receipt,
            'products': products,
            'products_count': len(products)
        }
    
    def search_receipts(self, store_name: Optional[str] = None, 
                        min_amount: Optional[float] = None,
                        max_amount: Optional[float] = None,
                        start_date: Optional[str] = None,
                        end_date: Optional[str] = None,
                        city: Optional[str] = None,
                        limit: int = 20) -> Dict:
        """
        Wyszukuje paragony według różnych kryteriów
        
        Args:
            store_name: Nazwa sklepu (opcjonalna)
            min_amount: Minimalna kwota (opcjonalna)
            max_amount: Maksymalna kwota (opcjonalna)
            start_date: Data początkowa (opcjonalna)
            end_date: Data końcowa (opcjonalna)
            city: Miasto (opcjonalne)
            limit: Maksymalna liczba wyników
            
        Returns:
            Dict z wynikami wyszukiwania
        """
        where_clauses = ["p.id_uzytkownika = :user_id"]
        params = {'user_id': self.user_id, 'limit': limit or 20}
        
        if store_name:
            where_clauses.append("f.nazwa LIKE :store_name")
            params['store_name'] = f"%{store_name}%"
        
        if min_amount is not None:
            where_clauses.append("p.suma >= :min_amount")
            params['min_amount'] = min_amount
        
        if max_amount is not None:
            where_clauses.append("p.suma <= :max_amount")
            params['max_amount'] = max_amount
        
        if start_date:
            where_clauses.append("DATE(p.data_dodania) >= :start_date")
            params['start_date'] = start_date
        
        if end_date:
            where_clauses.append("DATE(p.data_dodania) <= :end_date")
            params['end_date'] = end_date
        
        if city:
            where_clauses.append("m.nazwa LIKE :city")
            params['city'] = f"%{city}%"
        
        where_clause = " AND ".join(where_clauses)
        
        query = f"""
        SELECT 
            p.id_paragonu,
            p.data_dodania,
            p.suma,
            p.rabat,
            f.nazwa as sklep,
            m.nazwa as miasto,
            COUNT(pr.id_produktu) as liczba_produktow
        FROM paragony p
        LEFT JOIN firmy f ON p.id_firmy = f.id_firmy
        LEFT JOIN miasta m ON p.id_miasta = m.id_miasta
        LEFT JOIN produkty pr ON p.id_paragonu = pr.id_paragonu
        WHERE {where_clause}
        GROUP BY p.id_paragonu, p.data_dodania, p.suma, p.rabat, f.nazwa, m.nazwa
        ORDER BY p.data_dodania DESC
        LIMIT :limit
        """
        
        results = DatabaseHelper.fetch_all(query, params)
        
        return {
            'success': True,
            'receipts': results,
            'count': len(results),
            'filters_applied': {
                'store': store_name,
                'min_amount': min_amount,
                'max_amount': max_amount,
                'date_range': f"{start_date or 'początek'} - {end_date or 'dziś'}" if start_date or end_date else None,
                'city': city
            }
        }
    
    def get_recent_receipts(self, limit: int = 10) -> Dict:
        """
        Pobiera ostatnie paragony użytkownika
        
        Args:
            limit: Liczba paragonów do pobrania
            
        Returns:
            Dict z ostatnimi paragonami
        """
        if limit is None or limit <= 0:
            limit = 10
        
        query = """
        SELECT 
            p.id_paragonu,
            p.data_dodania,
            p.suma,
            f.nazwa as sklep,
            m.nazwa as miasto,
            COUNT(pr.id_produktu) as liczba_produktow
        FROM paragony p
        LEFT JOIN firmy f ON p.id_firmy = f.id_firmy
        LEFT JOIN miasta m ON p.id_miasta = m.id_miasta
        LEFT JOIN produkty pr ON p.id_paragonu = pr.id_paragonu
        WHERE p.id_uzytkownika = :user_id
        GROUP BY p.id_paragonu, p.data_dodania, p.suma, f.nazwa, m.nazwa
        ORDER BY p.data_dodania DESC
        LIMIT :limit
        """
        
        results = DatabaseHelper.fetch_all(query, {
            'user_id': self.user_id,
            'limit': limit
        })
        
        return {
            'success': True,
            'receipts': results,
            'count': len(results)
        }
    
    def get_receipt_statistics(self) -> Dict:
        """
        Pobiera ogólne statystyki paragonów użytkownika
        
        Returns:
            Dict ze statystykami
        """
        query = """
        SELECT 
            COUNT(DISTINCT p.id_paragonu) as total_receipts,
            COUNT(DISTINCT DATE(p.data_dodania)) as shopping_days,
            SUM(p.suma) as total_spent,
            AVG(p.suma) as avg_receipt_value,
            MIN(p.suma) as min_receipt_value,
            MAX(p.suma) as max_receipt_value,
            COUNT(DISTINCT p.id_firmy) as stores_count,
            MIN(p.data_dodania) as first_receipt_date,
            MAX(p.data_dodania) as last_receipt_date
        FROM paragony p
        WHERE p.id_uzytkownika = :user_id
        """
        
        stats = DatabaseHelper.fetch_one(query, {'user_id': self.user_id})
        
        if not stats or stats.get('total_receipts', 0) == 0:
            return {
                'success': True,
                'statistics': {
                    'total_receipts': 0,
                    'message': 'Brak paragonów w systemie'
                }
            }
        
        return {
            'success': True,
            'statistics': stats
        }
