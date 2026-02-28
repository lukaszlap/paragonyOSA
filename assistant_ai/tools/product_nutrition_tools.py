# -*- coding: utf-8 -*-
"""
Funkcje narzędzi związanych z informacjami o produktach (wartości odżywcze, alergeny)
"""

from typing import Dict, Optional
from db import DatabaseHelper


class ProductNutritionTools:
    """Klasa grupująca narzędzia do pobierania informacji o produktach"""
    
    def __init__(self, user_id: int):
        """
        Inicjalizacja narzędzi informacji o produktach
        
        Args:
            user_id: ID użytkownika
        """
        self.user_id = user_id
    
    def get_product_nutrition(self, product_name: str) -> Dict:
        """
        Pobiera informacje żywieniowe o produkcie
        
        Args:
            product_name: Nazwa produktu
            
        Returns:
            Dict z informacjami żywieniowymi
        """
        if not product_name:
            return {
                'success': False,
                'error': 'Wymagana nazwa produktu'
            }
        
        # Najpierw znajdź produkt w historii zakupów użytkownika
        product_query = """
        SELECT DISTINCT
            pr.nazwa as nazwa_produktu,
            pr.id_kodu
        FROM produkty pr
        JOIN paragony p ON pr.id_paragonu = p.id_paragonu
        WHERE p.id_uzytkownika = :user_id
        AND pr.nazwa LIKE :product_name
        AND pr.id_kodu IS NOT NULL
        AND pr.id_kodu != 1
        LIMIT 1
        """
        
        product = DatabaseHelper.fetch_one(product_query, {
            'user_id': self.user_id,
            'product_name': f"%{product_name}%"
        })
        
        if not product or not product.get('id_kodu'):
            return {
                'success': False,
                'product_name': product_name,
                'error': 'Nie znaleziono informacji żywieniowych dla tego produktu',
                'suggestion': 'Produkt nie ma przypisanego kodu EAN lub nie został jeszcze zeskanowany'
            }
        
        # Pobierz dane z tabeli kody_ean
        nutrition_query = """
        SELECT 
            kod_ean,
            nazwa_produktu,
            marka,
            image_url,
            kalorie,
            tluszcz,
            cukry,
            bialko,
            sol,
            blonnik,
            weglowodany,
            sod,
            wartosc_odzywcza,
            allergens,
            ingredients_text
        FROM kody_ean
        WHERE id_kodu = :id_kodu
        """
        
        nutrition = DatabaseHelper.fetch_one(nutrition_query, {
            'id_kodu': product['id_kodu']
        })
        
        if not nutrition:
            return {
                'success': False,
                'product_name': product_name,
                'error': 'Nie znaleziono danych żywieniowych'
            }
        
        # Przygotuj czytelny format odpowiedzi
        return {
            'success': True,
            'product_name': nutrition.get('nazwa_produktu') or product['nazwa_produktu'],
            'brand': nutrition.get('marka'),
            'ean_code': nutrition.get('kod_ean'),
            'nutrition_per_100g': {
                'calories': nutrition.get('kalorie'),
                'fat': nutrition.get('tluszcz'),
                'carbs': nutrition.get('weglowodany'),
                'sugar': nutrition.get('cukry'),
                'protein': nutrition.get('bialko'),
                'fiber': nutrition.get('blonnik'),
                'salt': nutrition.get('sol'),
                'sodium': nutrition.get('sod')
            },
            'nutrition_score': nutrition.get('wartosc_odzywcza'),
            'allergens': nutrition.get('allergens'),
            'ingredients': nutrition.get('ingredients_text'),
            'image_url': nutrition.get('image_url')
        }
    
    def search_products_by_nutrition(self, max_calories: Optional[float] = None,
                                     max_sugar: Optional[float] = None,
                                     min_protein: Optional[float] = None,
                                     has_allergens: Optional[bool] = None) -> Dict:
        """
        Wyszukuje produkty według kryteriów żywieniowych
        
        Args:
            max_calories: Maksymalna liczba kalorii
            max_sugar: Maksymalna zawartość cukru
            min_protein: Minimalna zawartość białka
            has_allergens: Czy filtrować produkty z alergenami
            
        Returns:
            Dict z produktami spełniającymi kryteria
        """
        where_clauses = ["pr.id_kodu IS NOT NULL", "pr.id_kodu != 1"]
        params = {'user_id': self.user_id}
        
        if max_calories is not None:
            where_clauses.append("ke.kalorie <= :max_calories")
            params['max_calories'] = max_calories
        
        if max_sugar is not None:
            where_clauses.append("ke.cukry <= :max_sugar")
            params['max_sugar'] = max_sugar
        
        if min_protein is not None:
            where_clauses.append("ke.bialko >= :min_protein")
            params['min_protein'] = min_protein
        
        if has_allergens is False:
            where_clauses.append("(ke.allergens IS NULL OR ke.allergens = '')")
        
        where_clause = " AND ".join(where_clauses)
        
        query = f"""
        SELECT DISTINCT
            pr.nazwa as nazwa_produktu,
            ke.marka,
            ke.kalorie,
            ke.tluszcz,
            ke.cukry,
            ke.bialko,
            ke.allergens,
            ke.wartosc_odzywcza
        FROM produkty pr
        JOIN paragony p ON pr.id_paragonu = p.id_paragonu
        JOIN kody_ean ke ON pr.id_kodu = ke.id_kodu
        WHERE p.id_uzytkownika = :user_id
        AND {where_clause}
        ORDER BY ke.wartosc_odzywcza DESC, ke.kalorie ASC
        LIMIT 50
        """
        
        results = DatabaseHelper.fetch_all(query, params)
        
        return {
            'success': True,
            'products': results,
            'count': len(results),
            'filters': {
                'max_calories': max_calories,
                'max_sugar': max_sugar,
                'min_protein': min_protein,
                'allergen_free': has_allergens is False
            }
        }
    
    def get_nutrition_summary(self, start_date: Optional[str] = None, 
                              end_date: Optional[str] = None) -> Dict:
        """
        Pobiera podsumowanie wartości odżywczych zakupionych produktów
        
        Args:
            start_date: Data początkowa (opcjonalna)
            end_date: Data końcowa (opcjonalna)
            
        Returns:
            Dict z podsumowaniem wartości odżywczych
        """
        where_clauses = [
            "p.id_uzytkownika = :user_id",
            "pr.id_kodu IS NOT NULL",
            "pr.id_kodu != 1"
        ]
        params = {'user_id': self.user_id}
        
        if start_date:
            where_clauses.append("DATE(p.data_dodania) >= :start_date")
            params['start_date'] = start_date
        
        if end_date:
            where_clauses.append("DATE(p.data_dodania) <= :end_date")
            params['end_date'] = end_date
        
        where_clause = " AND ".join(where_clauses)
        
        query = f"""
        SELECT 
            COUNT(DISTINCT pr.id_produktu) as products_with_nutrition_info,
            AVG(ke.kalorie) as avg_calories,
            AVG(ke.bialko) as avg_protein,
            AVG(ke.tluszcz) as avg_fat,
            AVG(ke.cukry) as avg_sugar,
            SUM(CASE WHEN ke.allergens IS NOT NULL AND ke.allergens != '' THEN 1 ELSE 0 END) as products_with_allergens
        FROM produkty pr
        JOIN paragony p ON pr.id_paragonu = p.id_paragonu
        JOIN kody_ean ke ON pr.id_kodu = ke.id_kodu
        WHERE {where_clause}
        """
        
        summary = DatabaseHelper.fetch_one(query, params)
        
        if not summary or summary.get('products_with_nutrition_info', 0) == 0:
            return {
                'success': True,
                'summary': {
                    'products_count': 0,
                    'message': 'Brak produktów z informacjami żywieniowymi w tym okresie'
                },
                'period': f"{start_date or 'początek'} - {end_date or 'dziś'}"
            }
        
        return {
            'success': True,
            'summary': summary,
            'period': f"{start_date or 'początek'} - {end_date or 'dziś'}"
        }
