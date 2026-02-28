# -*- coding: utf-8 -*-
"""
Simple database layer using SQLAlchemy with PyMySQL
Compatible with both MySQL and MariaDB
Obsługuje polskie znaki: ą, ć, ę, ł, ń, ó, ś, ź, ż
"""
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from decimal import Decimal
from datetime import datetime, date
import json

db = SQLAlchemy()

class DatabaseHelper:
    """Helper class for database operations"""
    
    @staticmethod
    def serialize_value(value, keep_bytes_fields=None):
        """Convert Decimal and datetime objects to JSON-serializable formats"""
        if isinstance(value, Decimal):
            return float(value)
        elif isinstance(value, (datetime, date)):
            return value.isoformat()
        elif isinstance(value, bytes):
            # Keep bytes as-is for password fields (bcrypt needs bytes)
            return value
        return value
    
    @staticmethod
    def serialize_row(row, keep_bytes_fields=None):
        """Convert a database row to a JSON-serializable dict"""
        if row is None:
            return None
        if keep_bytes_fields is None:
            keep_bytes_fields = ['password', 'obraz']  # Fields that should stay as bytes
        
        result = {}
        for key, value in row._mapping.items():
            if key in keep_bytes_fields and isinstance(value, bytes):
                # Keep password and obraz as bytes (bcrypt needs bytes, obraz needs base64 encoding)
                result[key] = value
            else:
                # Convert bytes to string for other fields - USE UTF-8 for Polish characters
                if isinstance(value, bytes):
                    try:
                        result[key] = value.decode('utf-8')
                    except UnicodeDecodeError:
                        # Fallback to latin1 if utf-8 fails
                        try:
                            result[key] = value.decode('latin1')
                        except Exception:
                            result[key] = value.decode('utf-8', errors='ignore')
                else:
                    result[key] = DatabaseHelper.serialize_value(value, keep_bytes_fields)
        return result
    
    @staticmethod
    def serialize_rows(rows):
        """Convert multiple database rows to JSON-serializable list"""
        return [DatabaseHelper.serialize_row(row) for row in rows]
    
    @staticmethod
    def fetch_all(query, params=None):
        """
        Execute SELECT query and return all results as list of dicts
        
        Args:
            query: SQL query string with :param_name placeholders
            params: Dictionary of parameters
            
        Returns:
            List of dictionaries
        """
        if params is None:
            params = {}
        
        result = db.session.execute(text(query), params)
        rows = result.fetchall()
        return DatabaseHelper.serialize_rows(rows)
    
    @staticmethod
    def fetch_one(query, params=None):
        """
        Execute SELECT query and return first result as dict
        
        Args:
            query: SQL query string with :param_name placeholders
            params: Dictionary of parameters
            
        Returns:
            Dictionary or None
        """
        if params is None:
            params = {}
        
        result = db.session.execute(text(query), params)
        row = result.fetchone()
        return DatabaseHelper.serialize_row(row)
    
    @staticmethod
    def execute(query: str, params: dict = None, return_lastrowid: bool = False):
        """
        Wykonuje zapytanie INSERT/UPDATE/DELETE
        
        Args:
            query: Zapytanie SQL
            params: Parametry zapytania (dict)
            return_lastrowid: Czy zwrócić ID ostatnio wstawionego wiersza
            
        Returns:
            int: Liczba zmodyfikowanych wierszy lub lastrowid jeśli return_lastrowid=True
            
        Raises:
            Exception: W przypadku błędu SQL
        """
        params = params or {}
        with db.engine.begin() as connection:
            result = connection.execute(text(query), params)
            if return_lastrowid:
                if getattr(result, "lastrowid", None) is not None:
                    return result.lastrowid
                inserted_pk = result.inserted_primary_key
                return inserted_pk[0] if inserted_pk else None
            return result.rowcount
    
    @staticmethod
    def get_last_insert_id():
        """Get the last inserted ID"""
        result = db.session.execute(text("SELECT LAST_INSERT_ID() as id"))
        row = result.fetchone()
        return row.id if row else None
    
    @staticmethod
    def commit():
        """Commit the current transaction"""
        db.session.commit()
    
    @staticmethod
    def rollback():
        """Rollback the current transaction"""
        db.session.rollback()
    
    @staticmethod
    def sprawdzKodEanWBazie(nazwa_produktu):
        """
        Sprawdza czy produkt o danej nazwie istnieje w bazie danych
        
        Args:
            nazwa_produktu: Nazwa produktu do sprawdzenia
            
        Returns:
            Dictionary z danymi produktu lub None jeśli nie znaleziono
        """
        query = """
            SELECT * FROM kody_ean 
            WHERE nazwa_produktu = :nazwa_produktu 
            AND id_kodu != 1
            LIMIT 1
        """
        return DatabaseHelper.fetch_one(query, {'nazwa_produktu': nazwa_produktu})
    
    @staticmethod
    def zapiszKodEanDoBazy(product_data):
        """
        Zapisuje informacje o produkcie do bazy danych
        
        Args:
            product_data: Słownik z danymi produktu (nazwa_produktu, marka, ean, etc.)
            
        Returns:
            ID zapisanego rekordu
        """
        query = """
            INSERT INTO kody_ean (
                kod_ean, nazwa_produktu, marka, image_url, 
                kalorie, tluszcz, cukry, bialko, sol, 
                blonnik, weglowodany, sod, wartosc_odzywcza, 
                allergens, ingredients_text
            ) VALUES (
                :kod_ean, :nazwa_produktu, :marka, :image_url,
                :kalorie, :tluszcz, :cukry, :bialko, :sol,
                :blonnik, :weglowodany, :sod, :wartosc_odzywcza,
                :allergens, :ingredients_text
            )
        """
        
        params = {
            'kod_ean': product_data.get('ean'),
            'nazwa_produktu': product_data.get('nazwa_produktu'),
            'marka': product_data.get('marka'),
            'image_url': product_data.get('image_thumb_url'),
            'kalorie': product_data.get('wartosci_odzywcze', {}).get('kalorie'),
            'tluszcz': product_data.get('wartosci_odzywcze', {}).get('tluszcz'),
            'cukry': product_data.get('wartosci_odzywcze', {}).get('cukry'),
            'bialko': product_data.get('wartosci_odzywcze', {}).get('bialko'),
            'sol': product_data.get('wartosci_odzywcze', {}).get('sol'),
            'blonnik': product_data.get('wartosci_odzywcze', {}).get('blonnik'),
            'weglowodany': product_data.get('wartosci_odzywcze', {}).get('weglowodany'),
            'sod': product_data.get('wartosci_odzywcze', {}).get('sod'),
            'wartosc_odzywcza': product_data.get('wartosci_odzywcze', {}).get('wartosc_odzywcza'),
            'allergens': product_data.get('wartosci_odzywcze', {}).get('allergens'),
            'ingredients_text': product_data.get('wartosci_odzywcze', {}).get('ingredients_text')
        }
        
        DatabaseHelper.execute(query, params)
        return DatabaseHelper.get_last_insert_id()
    
    @staticmethod
    def pobierzDaneZKodowEan(nazwa_produktu):
        """
        Pobiera pełne dane produktu z bazy danych i formatuje je do odpowiedzi API
        
        Args:
            nazwa_produktu: Nazwa produktu
            
        Returns:
            Lista słowników w formacie odpowiedzi API lub None
        """
        dane = DatabaseHelper.sprawdzKodEanWBazie(nazwa_produktu)
        if dane is None:
            return None
        
        # Formatowanie danych do struktury kompatybilnej z API
        return [{
            'nazwa_produktu': dane.get('nazwa_produktu'),
            'marka': dane.get('marka'),
            'image_thumb_url': dane.get('image_url'),
            'ean': dane.get('kod_ean'),
            'wartosci_odzywcze': {
                'kalorie': dane.get('kalorie'),
                'tluszcz': dane.get('tluszcz'),
                'cukry': dane.get('cukry'),
                'bialko': dane.get('bialko'),
                'sol': dane.get('sol'),
                'blonnik': dane.get('blonnik'),
                'weglowodany': dane.get('weglowodany'),
                'sod': dane.get('sod'),
                'wartosc_odzywcza': dane.get('wartosc_odzywcza'),
                'allergens': dane.get('allergens'),
                'ingredients_text': dane.get('ingredients_text')
            }
        }]
    
    @staticmethod
    def aktualizujIdKoduDlaProduktu(nazwa_produktu, id_kodu):
        """
        Aktualizuje id_kodu dla wszystkich produktów o danej nazwie w tabeli produkty
        
        Args:
            nazwa_produktu: Nazwa produktu do zaktualizowania
            id_kodu: Nowe id_kodu do przypisania
            
        Returns:
            Liczba zaktualizowanych rekordów
        """
        query = """
            UPDATE produkty 
            SET id_kodu = :id_kodu 
            WHERE nazwa = :nazwa_produktu 
            AND id_kodu = 1
        """
        DatabaseHelper.execute(query, {
            'id_kodu': id_kodu,
            'nazwa_produktu': nazwa_produktu
        })
        # Sprawdź ile produktów zostało zaktualizowanych
        check_query = """
            SELECT COUNT(*) as count FROM produkty 
            WHERE nazwa = :nazwa_produktu AND id_kodu = :id_kodu
        """
        result = DatabaseHelper.fetch_one(check_query, {
            'nazwa_produktu': nazwa_produktu,
            'id_kodu': id_kodu
        })
        return result.get('count', 0) if result else 0


