# -*- coding: utf-8 -*-
"""
Funkcje narzędzi związanych z wydatkami i zakupami
"""

from typing import Dict, Optional
from db import DatabaseHelper


class ExpenseTools:
    """Klasa grupująca narzędzia do analizy wydatków"""
    
    def __init__(self, user_id: int):
        """
        Inicjalizacja narzędzi wydatków
        
        Args:
            user_id: ID użytkownika
        """
        self.user_id = user_id
    
    def get_expenses_by_date(self, start_date: str = None, end_date: str = None) -> Dict:
        """Pobiera wydatki z określonego okresu"""
        # Walidacja parametrów
        if not start_date or not end_date:
            return {
                'receipts': [],
                'count': 0,
                'total_amount': 0,
                'period': 'brak danych',
                'error': 'Wymagane są daty start_date i end_date'
            }
        
        query = """
        SELECT 
            p.id_paragonu,
            p.data_dodania,
            p.suma,
            f.nazwa as sklep,
            m.nazwa as miasto
        FROM paragony p
        LEFT JOIN firmy f ON p.id_firmy = f.id_firmy
        LEFT JOIN miasta m ON p.id_miasta = m.id_miasta
        WHERE p.id_uzytkownika = :user_id
        AND DATE(p.data_dodania) BETWEEN :start_date AND :end_date
        ORDER BY p.data_dodania DESC
        """
        
        results = DatabaseHelper.fetch_all(query, {
            'user_id': self.user_id,
            'start_date': start_date,
            'end_date': end_date
        })
        
        total = sum(float(r['suma']) for r in results if r['suma'])
        
        return {
            'receipts': results,
            'count': len(results),
            'total_amount': round(total, 2),
            'period': f"{start_date} do {end_date}"
        }
    
    def get_expenses_by_category(self, category: str = None, start_date: str = None, end_date: str = None) -> Dict:
        """Pobiera wydatki z określonej kategorii"""
        # Walidacja parametrów
        if not category or not start_date or not end_date:
            return {
                'products': [],
                'count': 0,
                'total_amount': 0,
                'category': category or 'nieznana',
                'period': 'brak danych',
                'error': 'Wymagane są parametry: category, start_date, end_date'
            }
        
        query = """
        SELECT 
            pr.id_produktu,
            pr.nazwa as nazwa_produktu,
            pr.cena,
            p.data_dodania,
            f.nazwa as sklep
        FROM produkty pr
        JOIN paragony p ON pr.id_paragonu = p.id_paragonu
        JOIN kategorie k ON pr.id_kategorii = k.id_kategorii
        LEFT JOIN firmy f ON p.id_firmy = f.id_firmy
        WHERE p.id_uzytkownika = :user_id
        AND k.nazwa LIKE :category
        AND DATE(p.data_dodania) BETWEEN :start_date AND :end_date
        ORDER BY p.data_dodania DESC
        """
        
        results = DatabaseHelper.fetch_all(query, {
            'user_id': self.user_id,
            'category': f"%{category}%",
            'start_date': start_date,
            'end_date': end_date
        })
        
        total = sum(float(r['cena']) for r in results if r['cena'])
        
        return {
            'products': results,
            'count': len(results),
            'total_amount': round(total, 2),
            'category': category,
            'period': f"{start_date} do {end_date}"
        }
    
    def get_expenses_by_store(self, store_name: str = None, start_date: str = None, end_date: str = None) -> Dict:
        """Pobiera wydatki w określonym sklepie"""
        # Walidacja parametrów
        if not store_name or not start_date or not end_date:
            return {
                'receipts': [],
                'count': 0,
                'total_amount': 0,
                'store': store_name or 'nieznany',
                'period': 'brak danych',
                'error': 'Wymagane są parametry: store_name, start_date, end_date'
            }
        
        query = """
        SELECT 
            p.id_paragonu,
            p.data_dodania,
            p.suma,
            f.nazwa as sklep,
            COUNT(pr.id_produktu) as liczba_produktow
        FROM paragony p
        JOIN firmy f ON p.id_firmy = f.id_firmy
        LEFT JOIN produkty pr ON p.id_paragonu = pr.id_paragonu
        WHERE p.id_uzytkownika = :user_id
        AND f.nazwa LIKE :store_name
        AND DATE(p.data_dodania) BETWEEN :start_date AND :end_date
        GROUP BY p.id_paragonu, p.data_dodania, p.suma, f.nazwa
        ORDER BY p.data_dodania DESC
        """
        
        results = DatabaseHelper.fetch_all(query, {
            'user_id': self.user_id,
            'store_name': f"%{store_name}%",
            'start_date': start_date,
            'end_date': end_date
        })
        
        total = sum(float(r['suma']) for r in results if r['suma'])
        
        return {
            'receipts': results,
            'count': len(results),
            'total_amount': round(total, 2),
            'store': store_name,
            'period': f"{start_date} do {end_date}"
        }
    
    def get_spending_summary(self, start_date: str = None, end_date: str = None, group_by: Optional[str] = None) -> Dict:
        """Pobiera podsumowanie wydatków"""
        # Walidacja parametrów
        if not start_date or not end_date:
            return {
                'summary': [],
                'group_by': group_by or 'overall',
                'period': 'brak danych',
                'error': 'Wymagane są daty start_date i end_date'
            }
        
        if group_by == 'category':
            query = """
            SELECT 
                k.nazwa as kategoria,
                COUNT(DISTINCT p.id_paragonu) as liczba_paragonow,
                COUNT(pr.id_produktu) as liczba_produktow,
                SUM(pr.cena) as suma_wydatkow,
                AVG(pr.cena) as srednia_cena
            FROM paragony p
            LEFT JOIN produkty pr ON p.id_paragonu = pr.id_paragonu
            LEFT JOIN kategorie k ON pr.id_kategorii = k.id_kategorii
            WHERE p.id_uzytkownika = :user_id
            AND DATE(p.data_dodania) BETWEEN :start_date AND :end_date
            GROUP BY k.nazwa
            ORDER BY suma_wydatkow DESC
            """
        elif group_by == 'store':
            query = """
            SELECT 
                f.nazwa as sklep,
                COUNT(p.id_paragonu) as liczba_wizyt,
                SUM(p.suma) as suma_wydatkow,
                AVG(p.suma) as srednia_wydatek
            FROM paragony p
            LEFT JOIN firmy f ON p.id_firmy = f.id_firmy
            WHERE p.id_uzytkownika = :user_id
            AND DATE(p.data_dodania) BETWEEN :start_date AND :end_date
            GROUP BY f.nazwa
            ORDER BY suma_wydatkow DESC
            """
        else:
            query = """
            SELECT 
                COUNT(p.id_paragonu) as liczba_paragonow,
                SUM(p.suma) as suma_wydatkow,
                AVG(p.suma) as srednia_paragon,
                MIN(p.suma) as min_wydatek,
                MAX(p.suma) as max_wydatek
            FROM paragony p
            WHERE p.id_uzytkownika = :user_id
            AND DATE(p.data_dodania) BETWEEN :start_date AND :end_date
            """
        
        results = DatabaseHelper.fetch_all(query, {
            'user_id': self.user_id,
            'start_date': start_date,
            'end_date': end_date
        })
        
        return {
            'summary': results,
            'group_by': group_by or 'overall',
            'period': f"{start_date} do {end_date}"
        }
    
    def get_most_expensive_purchases(self, start_date: str = None, end_date: str = None, limit: int = 5) -> Dict:
        """Pobiera najdroższe zakupy"""
        # Walidacja parametrów
        if not start_date or not end_date:
            return {
                'most_expensive': [],
                'count': 0,
                'period': 'brak danych',
                'error': 'Wymagane są daty start_date i end_date'
            }
        
        # Walidacja limit
        if limit is None or limit <= 0:
            limit = 5
        
        query = """
        SELECT 
            p.id_paragonu,
            p.data_dodania,
            p.suma,
            f.nazwa as sklep,
            m.nazwa as miasto
        FROM paragony p
        LEFT JOIN firmy f ON p.id_firmy = f.id_firmy
        LEFT JOIN miasta m ON p.id_miasta = m.id_miasta
        WHERE p.id_uzytkownika = :user_id
        AND DATE(p.data_dodania) BETWEEN :start_date AND :end_date
        ORDER BY p.suma DESC
        LIMIT :limit
        """
        
        results = DatabaseHelper.fetch_all(query, {
            'user_id': self.user_id,
            'start_date': start_date,
            'end_date': end_date,
            'limit': limit
        })
        
        return {
            'most_expensive': results,
            'count': len(results),
            'period': f"{start_date} do {end_date}"
        }
    
    def get_shopping_frequency(self, start_date: str = None, end_date: str = None) -> Dict:
        """Pobiera częstotliwość zakupów w sklepach"""
        # Walidacja parametrów
        if not start_date or not end_date:
            return {
                'stores': [],
                'count': 0,
                'period': 'brak danych',
                'error': 'Wymagane są daty start_date i end_date'
            }
        
        query = """
        SELECT 
            f.nazwa as sklep,
            COUNT(p.id_paragonu) as liczba_wizyt,
            SUM(p.suma) as suma_wydatkow,
            AVG(p.suma) as sredni_wydatek,
            MIN(p.data_dodania) as pierwsza_wizyta,
            MAX(p.data_dodania) as ostatnia_wizyta
        FROM paragony p
        JOIN firmy f ON p.id_firmy = f.id_firmy
        WHERE p.id_uzytkownika = :user_id
        AND DATE(p.data_dodania) BETWEEN :start_date AND :end_date
        GROUP BY f.nazwa
        ORDER BY liczba_wizyt DESC
        """
        
        results = DatabaseHelper.fetch_all(query, {
            'user_id': self.user_id,
            'start_date': start_date,
            'end_date': end_date
        })
        
        return {
            'stores': results,
            'count': len(results),
            'period': f"{start_date} do {end_date}"
        }
    
    def get_product_history(self, product_name: str = None, limit: int = 10) -> Dict:
        """Pobiera historię zakupów produktu"""
        # Walidacja parametrów
        if not product_name:
            return {
                'product_name': 'nieznany',
                'history': [],
                'count': 0,
                'price_stats': {'average': 0, 'min': 0, 'max': 0},
                'error': 'Wymagana jest nazwa produktu'
            }
        
        # Walidacja limit
        if limit is None or limit <= 0:
            limit = 10
        
        query = """
        SELECT 
            pr.id_produktu,
            pr.nazwa as nazwa_produktu,
            pr.cena,
            p.data_dodania,
            f.nazwa as sklep,
            k.nazwa as kategoria
        FROM produkty pr
        JOIN paragony p ON pr.id_paragonu = p.id_paragonu
        LEFT JOIN firmy f ON p.id_firmy = f.id_firmy
        LEFT JOIN kategorie k ON pr.id_kategorii = k.id_kategorii
        WHERE p.id_uzytkownika = :user_id
        AND pr.nazwa LIKE :product_name
        ORDER BY p.data_dodania DESC
        LIMIT :limit
        """
        
        results = DatabaseHelper.fetch_all(query, {
            'user_id': self.user_id,
            'product_name': f"%{product_name}%",
            'limit': limit
        })
        
        if results:
            prices = [float(r['cena']) for r in results if r['cena']]
            avg_price = sum(prices) / len(prices) if prices else 0
            min_price = min(prices) if prices else 0
            max_price = max(prices) if prices else 0
        else:
            avg_price = min_price = max_price = 0
        
        return {
            'product_name': product_name,
            'history': results,
            'count': len(results),
            'price_stats': {
                'average': round(avg_price, 2),
                'min': round(min_price, 2),
                'max': round(max_price, 2)
            }
        }
    
    def compare_periods(self, period1_start: str = None, period1_end: str = None, 
                        period2_start: str = None, period2_end: str = None) -> Dict:
        """Porównuje wydatki między dwoma okresami"""
        # Walidacja parametrów
        if not all([period1_start, period1_end, period2_start, period2_end]):
            return {
                'period1': {'range': 'brak danych', 'summary': []},
                'period2': {'range': 'brak danych', 'summary': []},
                'comparison': {'difference': 0, 'percent_change': 0, 'trend': 'brak danych'},
                'error': 'Wymagane są wszystkie 4 daty: period1_start, period1_end, period2_start, period2_end'
            }
        
        # Pobierz dane dla pierwszego okresu
        summary1 = self.get_spending_summary(period1_start, period1_end)
        
        # Pobierz dane dla drugiego okresu
        summary2 = self.get_spending_summary(period2_start, period2_end)
        
        # Oblicz różnice
        if summary1['summary'] and summary2['summary']:
            total1 = float(summary1['summary'][0].get('suma_wydatkow', 0) or 0)
            total2 = float(summary2['summary'][0].get('suma_wydatkow', 0) or 0)
            difference = total2 - total1
            percent_change = (difference / total1 * 100) if total1 > 0 else 0
        else:
            difference = 0
            percent_change = 0
        
        return {
            'period1': {
                'range': f"{period1_start} do {period1_end}",
                'summary': summary1['summary']
            },
            'period2': {
                'range': f"{period2_start} do {period2_end}",
                'summary': summary2['summary']
            },
            'comparison': {
                'difference': round(difference, 2),
                'percent_change': round(percent_change, 2),
                'trend': 'wzrost' if difference > 0 else 'spadek' if difference < 0 else 'bez zmian'
            }
        }
    
    def get_top_stores(self, start_date: str = None, end_date: str = None, limit: int = 10) -> Dict:
        """Pobiera ranking sklepów według wydatków"""
        if not start_date or not end_date:
            return {
                'stores': [],
                'count': 0,
                'period': 'brak danych',
                'error': 'Wymagane są daty start_date i end_date'
            }
        
        if limit is None or limit <= 0:
            limit = 10
        
        query = """
        SELECT 
            f.nazwa as sklep,
            COUNT(p.id_paragonu) as liczba_wizyt,
            SUM(p.suma) as suma_wydatkow,
            AVG(p.suma) as sredni_paragon,
            COUNT(DISTINCT DATE(p.data_dodania)) as dni_zakupow,
            MIN(p.data_dodania) as pierwsza_wizyta,
            MAX(p.data_dodania) as ostatnia_wizyta
        FROM paragony p
        JOIN firmy f ON p.id_firmy = f.id_firmy
        WHERE p.id_uzytkownika = :user_id
        AND DATE(p.data_dodania) BETWEEN :start_date AND :end_date
        GROUP BY f.nazwa
        ORDER BY suma_wydatkow DESC
        LIMIT :limit
        """
        
        results = DatabaseHelper.fetch_all(query, {
            'user_id': self.user_id,
            'start_date': start_date,
            'end_date': end_date,
            'limit': limit
        })
        
        return {
            'stores': results,
            'count': len(results),
            'period': f"{start_date} do {end_date}"
        }
    
    def get_category_breakdown(self, start_date: str = None, end_date: str = None) -> Dict:
        """Pobiera szczegółowy rozkład wydatków po kategoriach z procentami"""
        if not start_date or not end_date:
            return {
                'categories': [],
                'count': 0,
                'total': 0,
                'period': 'brak danych',
                'error': 'Wymagane są daty start_date i end_date'
            }
        
        query = """
        SELECT 
            k.nazwa as kategoria,
            COUNT(pr.id_produktu) as liczba_produktow,
            SUM(pr.cena) as suma_wydatkow,
            AVG(pr.cena) as srednia_cena,
            MIN(pr.cena) as min_cena,
            MAX(pr.cena) as max_cena
        FROM produkty pr
        JOIN paragony p ON pr.id_paragonu = p.id_paragonu
        JOIN kategorie k ON pr.id_kategorii = k.id_kategorii
        WHERE p.id_uzytkownika = :user_id
        AND DATE(p.data_dodania) BETWEEN :start_date AND :end_date
        GROUP BY k.nazwa
        ORDER BY suma_wydatkow DESC
        """
        
        results = DatabaseHelper.fetch_all(query, {
            'user_id': self.user_id,
            'start_date': start_date,
            'end_date': end_date
        })
        
        # Oblicz całkowitą sumę i procenty
        total = sum(float(r.get('suma_wydatkow', 0) or 0) for r in results)
        
        for r in results:
            suma = float(r.get('suma_wydatkow', 0) or 0)
            r['procent'] = round((suma / total * 100), 2) if total > 0 else 0
        
        return {
            'categories': results,
            'count': len(results),
            'total': round(total, 2),
            'period': f"{start_date} do {end_date}"
        }
    
    def get_monthly_trends(self, months: int = 6) -> Dict:
        """Pobiera trendy wydatków w ostatnich N miesiącach"""
        if months is None or months <= 0:
            months = 6
        
        query = """
        SELECT 
            DATE_FORMAT(p.data_dodania, '%Y-%m') as miesiac,
            COUNT(p.id_paragonu) as liczba_paragonow,
            SUM(p.suma) as suma_wydatkow,
            AVG(p.suma) as sredni_paragon
        FROM paragony p
        WHERE p.id_uzytkownika = :user_id
        AND p.data_dodania >= DATE_SUB(CURDATE(), INTERVAL :months MONTH)
        GROUP BY DATE_FORMAT(p.data_dodania, '%Y-%m')
        ORDER BY miesiac ASC
        """
        
        results = DatabaseHelper.fetch_all(query, {
            'user_id': self.user_id,
            'months': months
        })
        
        # Oblicz trend (wzrostowy/spadkowy)
        if len(results) >= 2:
            first_month = float(results[0].get('suma_wydatkow', 0) or 0)
            last_month = float(results[-1].get('suma_wydatkow', 0) or 0)
            trend_change = last_month - first_month
            trend_percent = (trend_change / first_month * 100) if first_month > 0 else 0
            trend = 'wzrostowy' if trend_change > 0 else 'spadkowy' if trend_change < 0 else 'stabilny'
        else:
            trend_change = 0
            trend_percent = 0
            trend = 'brak danych'
        
        return {
            'monthly_data': results,
            'months_count': len(results),
            'trend': trend,
            'trend_change': round(trend_change, 2),
            'trend_percent': round(trend_percent, 2)
        }
    
    def get_spending_patterns(self, start_date: str = None, end_date: str = None) -> Dict:
        """Analizuje wzorce wydatków (dni tygodnia, pory dnia)"""
        if not start_date or not end_date:
            return {
                'patterns': {},
                'period': 'brak danych',
                'error': 'Wymagane są daty start_date i end_date'
            }
        
        # Wydatki według dni tygodnia
        weekday_query = """
        SELECT 
            DAYNAME(p.data_dodania) as dzien_tygodnia,
            DAYOFWEEK(p.data_dodania) as numer_dnia,
            COUNT(p.id_paragonu) as liczba_zakupow,
            SUM(p.suma) as suma_wydatkow,
            AVG(p.suma) as sredni_wydatek
        FROM paragony p
        WHERE p.id_uzytkownika = :user_id
        AND DATE(p.data_dodania) BETWEEN :start_date AND :end_date
        GROUP BY dzien_tygodnia, numer_dnia
        ORDER BY numer_dnia
        """
        
        weekday_data = DatabaseHelper.fetch_all(weekday_query, {
            'user_id': self.user_id,
            'start_date': start_date,
            'end_date': end_date
        })
        
        # Wydatki według pór dnia
        daytime_query = """
        SELECT 
            CASE 
                WHEN HOUR(p.data_dodania) BETWEEN 6 AND 11 THEN 'Rano (6-11)'
                WHEN HOUR(p.data_dodania) BETWEEN 12 AND 17 THEN 'Popołudnie (12-17)'
                WHEN HOUR(p.data_dodania) BETWEEN 18 AND 22 THEN 'Wieczór (18-22)'
                ELSE 'Noc (23-5)'
            END as pora_dnia,
            COUNT(p.id_paragonu) as liczba_zakupow,
            SUM(p.suma) as suma_wydatkow,
            AVG(p.suma) as sredni_wydatek
        FROM paragony p
        WHERE p.id_uzytkownika = :user_id
        AND DATE(p.data_dodania) BETWEEN :start_date AND :end_date
        GROUP BY pora_dnia
        ORDER BY 
            CASE pora_dnia
                WHEN 'Rano (6-11)' THEN 1
                WHEN 'Popołudnie (12-17)' THEN 2
                WHEN 'Wieczór (18-22)' THEN 3
                ELSE 4
            END
        """
        
        daytime_data = DatabaseHelper.fetch_all(daytime_query, {
            'user_id': self.user_id,
            'start_date': start_date,
            'end_date': end_date
        })
        
        # Znajdź najczęstszy dzień i porę zakupów
        most_active_day = max(weekday_data, key=lambda x: x.get('liczba_zakupow', 0)) if weekday_data else None
        most_active_time = max(daytime_data, key=lambda x: x.get('liczba_zakupow', 0)) if daytime_data else None
        
        return {
            'by_weekday': weekday_data,
            'by_daytime': daytime_data,
            'most_active_day': most_active_day.get('dzien_tygodnia') if most_active_day else None,
            'most_active_time': most_active_time.get('pora_dnia') if most_active_time else None,
            'period': f"{start_date} do {end_date}"
        }
