# -*- coding: utf-8 -*-
"""
Funkcje narzędzi związanych z listami zakupów
"""

from typing import Dict, Optional
from db import DatabaseHelper


class ShoppingListTools:
    """Klasa grupująca narzędzia do zarządzania listami zakupów"""
    
    def __init__(self, user_id: int):
        """
        Inicjalizacja narzędzi list zakupów
        
        Args:
            user_id: ID użytkownika
        """
        self.user_id = user_id
    
    def manage_shopping_list(self, action: Optional[str] = None, list_id: Optional[int] = None, 
                              product_name: Optional[str] = None, quantity: int = 1) -> Dict:
        """
        Zarządza listami zakupów użytkownika
        
        Args:
            action: Akcja (create_list/add_item/remove_item/get_list/delete_list)
            list_id: ID listy
            product_name: Nazwa produktu
            quantity: Ilość produktu
            
        Returns:
            Dict z wynikiem operacji
        """
        if not action:
            return {
                'success': False,
                'error': 'Wymagany parametr: action'
            }
        
        if action == 'create_list':
            return self._create_list()
        elif action == 'add_item':
            return self._add_item(list_id, product_name, quantity)
        elif action == 'get_list':
            return self._get_list(list_id)
        elif action == 'remove_item':
            return self._remove_item(list_id, product_name)
        elif action == 'delete_list':
            return self._delete_list(list_id)
        else:
            return {
                'success': False,
                'error': f'Nieznana akcja: {action}. Dostępne: create_list, add_item, remove_item, get_list, delete_list'
            }
    
    def _create_list(self) -> Dict:
        """Tworzy nową listę zakupów"""
        insert_query = """
        INSERT INTO lista (id_uzytkownika, Data_Dodania)
        VALUES (:user_id, NOW())
        """
        result = DatabaseHelper.execute(insert_query, {'user_id': self.user_id}, return_lastrowid=True)
        
        return {
            'success': True,
            'action': 'created',
            'list_id': result,
            'message': f'✅ Utworzono nową listę zakupów (ID: {result})'
        }
    
    def _add_item(self, list_id: Optional[int], product_name: Optional[str], quantity: int) -> Dict:
        """Dodaje produkt do listy zakupów"""
        if not product_name:
            return {
                'success': False,
                'error': 'Wymagana nazwa produktu'
            }
        
        # Jeśli nie podano list_id, użyj najnowszej listy użytkownika
        if not list_id:
            list_id = self._get_or_create_latest_list()
            if not list_id:
                return {
                    'success': False,
                    'error': 'Nie udało się utworzyć listy zakupów'
                }
        
        # Spróbuj znaleźć produkt w historii zakupów użytkownika
        product_query = """
        SELECT 
            pr.id_produktu,
            pr.nazwa AS nazwa_produktu,
            p.data_dodania AS data_zakupu
        FROM produkty pr
        JOIN paragony p ON pr.id_paragonu = p.id_paragonu
        WHERE p.id_uzytkownika = :user_id
          AND pr.nazwa LIKE :product_name
        ORDER BY p.data_dodania DESC
        LIMIT 1
        """
        product_result = DatabaseHelper.fetch_one(product_query, {
            'product_name': f"%{product_name}%",
            'user_id': self.user_id
        })
        
        # Jeśli znaleziono produkt w historii, użyj jego ID
        if product_result:
            product_id = product_result['id_produktu']
            display_name = product_result['nazwa_produktu']
        else:
            product_id = None
            display_name = product_name
        
        # Sprawdź czy produkt już jest na liście
        if product_id:
            existing_item = DatabaseHelper.fetch_one("""
                SELECT id, ilosc
                FROM listy
                WHERE id_listy = :list_id
                  AND id_produktu = :product_id
                  AND id_uzytkownika = :user_id
                """, {
                    'list_id': list_id,
                    'product_id': product_id,
                    'user_id': self.user_id
                })
        else:
            existing_item = None
        
        if existing_item:
            # Produkt już jest na liście - zwiększ ilość
            new_quantity = existing_item["ilosc"] + (quantity or 1)
            DatabaseHelper.execute("""
                UPDATE listy
                SET ilosc = ilosc + :quantity
                WHERE id = :item_id
            """, {
                'quantity': quantity or 1,
                'item_id': existing_item['id']
            })
            action_msg = f'✅ Zwiększono ilość "{display_name}" na liście do {new_quantity}'
        else:
            # Dodaj produkt do listy (id_produktu może być NULL)
            DatabaseHelper.execute("""
                INSERT INTO listy (id_listy, id_produktu, ilosc, id_uzytkownika)
                VALUES (:list_id, :product_id, :quantity, :user_id)
            """, {
                'list_id': list_id,
                'product_id': product_id,  # Może być None/NULL
                'quantity': quantity or 1,
                'user_id': self.user_id
            })
            action_msg = f'✅ Dodano "{display_name}" x{quantity or 1} do listy zakupów'
        
        return {
            'success': True,
            'action': 'item_added',
            'list_id': list_id,
            'product_name': display_name,
            'quantity': quantity or 1,
            'message': action_msg
        }
    
    def _get_list(self, list_id: Optional[int]) -> Dict:
        """Pobiera listę zakupów"""
        if not list_id:
            # Pobierz najnowszą listę
            get_latest_query = "SELECT id FROM lista WHERE id_uzytkownika = :user_id ORDER BY Data_Dodania DESC LIMIT 1"
            latest_list = DatabaseHelper.fetch_one(get_latest_query, {'user_id': self.user_id})
            
            if not latest_list:
                return {
                    'success': False,
                    'error': 'Nie masz żadnych list zakupów',
                    'suggestion': 'Utwórz nową listę używając akcji create_list'
                }
            list_id = latest_list['id']
        
        get_items_query = """
        SELECT 
            l.id,
            p.nazwa as nazwa_produktu,
            l.ilosc,
            l.id_produktu
        FROM listy l
        LEFT JOIN produkty p ON l.id_produktu = p.id_produktu
        WHERE l.id_listy = :list_id AND l.id_uzytkownika = :user_id
        """
        items = DatabaseHelper.fetch_all(get_items_query, {
            'list_id': list_id,
            'user_id': self.user_id
        })
        
        return {
            'success': True,
            'action': 'list_retrieved',
            'list_id': list_id,
            'items': items,
            'count': len(items),
            'message': f'📋 Lista zakupów ({len(items)} produktów)'
        }
    
    def _remove_item(self, list_id: Optional[int], product_name: Optional[str]) -> Dict:
        """Usuwa produkt z listy zakupów"""
        if not product_name:
            return {
                'success': False,
                'error': 'Wymagana nazwa produktu'
            }
        
        # Usuń produkt z listy
        delete_query = """
        DELETE FROM listy
        WHERE id_uzytkownika = :user_id 
        AND (id_listy = :list_id OR id_listy IN (SELECT id FROM lista WHERE id_uzytkownika = :user_id ORDER BY Data_Dodania DESC LIMIT 1))
        AND id_produktu IN (SELECT id_produktu FROM produkty WHERE nazwa LIKE :product_name LIMIT 1)
        """
        rows_affected = DatabaseHelper.execute(delete_query, {
            'user_id': self.user_id,
            'list_id': list_id or 0,
            'product_name': f"%{product_name}%"
        })
        
        if rows_affected == 0:
            return {
                'success': False,
                'error': f'Nie znaleziono produktu "{product_name}" na liście'
            }
        
        return {
            'success': True,
            'action': 'item_removed',
            'product_name': product_name,
            'message': f'✅ Usunięto "{product_name}" z listy zakupów'
        }
    
    def _delete_list(self, list_id: Optional[int]) -> Dict:
        """Usuwa całą listę zakupów"""
        if not list_id:
            return {
                'success': False,
                'error': 'Wymagane ID listy do usunięcia'
            }
        
        # Usuń wszystkie produkty z listy
        delete_items_query = "DELETE FROM listy WHERE id_listy = :list_id AND id_uzytkownika = :user_id"
        DatabaseHelper.execute(delete_items_query, {
            'list_id': list_id,
            'user_id': self.user_id
        })
        
        # Usuń samą listę
        delete_list_query = "DELETE FROM lista WHERE id = :list_id AND id_uzytkownika = :user_id"
        rows_affected = DatabaseHelper.execute(delete_list_query, {
            'list_id': list_id,
            'user_id': self.user_id
        })
        
        if rows_affected == 0:
            return {
                'success': False,
                'error': f'Nie znaleziono listy o ID {list_id}'
            }
        
        return {
            'success': True,
            'action': 'list_deleted',
            'list_id': list_id,
            'message': '✅ Usunięto listę zakupów'
        }
    
    def _get_or_create_latest_list(self) -> Optional[int]:
        """Pobiera ID najnowszej listy lub tworzy nową"""
        get_latest_query = "SELECT id FROM lista WHERE id_uzytkownika = :user_id ORDER BY Data_Dodania DESC LIMIT 1"
        latest_list = DatabaseHelper.fetch_one(get_latest_query, {'user_id': self.user_id})
        
        if not latest_list:
            # Utwórz nową listę automatycznie
            create_result = self._create_list()
            if create_result.get('success'):
                return create_result['list_id']
            return None
        else:
            return latest_list['id']
