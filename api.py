# -*- coding: utf-8 -*-
"""
API - obsługa logiki biznesowej aplikacji
Obsługuje polskie znaki: ą, ć, ę, ł, ń, ó, ś, ź, ż
"""
import base64
from decimal import Decimal
from flask import jsonify, json, session
from datetime import datetime
import random
import pyttsx3
from db import DatabaseHelper
from PIL import Image
import os
import requests
from datetime import datetime, timedelta


def log_user_action(user_id, action, user_status, details=None):
    """Store a single audit log entry."""
    try:
        DatabaseHelper.execute(
            """
            INSERT INTO logi (id_uzytkownika, action, user_status_at_log, details)
            VALUES (:user_id, :action, :status, :details)
            """,
            {
                "user_id": user_id,
                "action": action,
                "status": user_status,
                "details": details,
            },
        )
    except Exception as e:
        print(f"Error logging user action: {e}")


def get_user_status(user_id):
    """Fetch latest user status for logging."""
    try:
        record = DatabaseHelper.fetch_one(
            "SELECT status FROM uzytkownicy WHERE id_uzytkownika = :user_id",
            {"user_id": user_id},
        )
        return record.get("status", "unknown") if record else "unknown"
    except Exception as e:
        print(f"Error getting user status: {e}")
        return "unknown"

class Api:
    @staticmethod
    def paragony(id_uzytkownika, page, size):
        offset = page * size
        print(offset)
        query = """SELECT 
                p.id_paragonu, 
                f.nazwa AS nazwa_firmy, 
                m.nazwa AS nazwa_miasta, 
                m.kod_pocztowy AS kod_pocztowy, 
                p.ulica, 
                p.suma, 
                p.rabat, 
                p.opis, 
                p.data_dodania
                FROM 
                    paragony p
                JOIN 
                    firmy f ON p.id_firmy = f.id_firmy
                JOIN 
                    miasta m ON p.id_miasta = m.id_miasta
                WHERE 
                    p.id_uzytkownika = :id_uzytkownika
                ORDER BY    
                    p.id_paragonu DESC
                LIMIT :size OFFSET :offset"""
        paragony = DatabaseHelper.fetch_all(query, {
            "id_uzytkownika": id_uzytkownika, 
            "size": size, 
            "offset": offset
        })
        
        # Log działania
        user_status = get_user_status(id_uzytkownika)
        log_user_action(
            id_uzytkownika,
            "fetch_receipts_list",
            user_status,
            json.dumps({"page": page, "size": size, "count": len(paragony) if paragony else 0}, ensure_ascii=False)
        )
        
        return json.dumps(paragony, ensure_ascii=False)
    
    @staticmethod
    def paragon(id_uzytkownika, id_paragonu):
        paragon = DatabaseHelper.fetch_all("""SELECT 
        p.id_paragonu, 
        f.nazwa AS nazwa_firmy, 
        m.nazwa AS nazwa_miasta, 
        m.kod_pocztowy AS kod_pocztowy, 
        p.ulica, 
        p.suma, 
        p.rabat, 
        p.opis, 
        p.data_dodania,
        p.obraz
        FROM 
            paragony p
        JOIN 
            firmy f ON p.id_firmy = f.id_firmy
        JOIN 
            miasta m ON p.id_miasta = m.id_miasta
        WHERE 
            p.id_uzytkownika = :id_uzytkownika
        AND 
            p.id_paragonu = :id_paragonu""", {
                "id_uzytkownika": id_uzytkownika, 
                "id_paragonu": id_paragonu
            })
        # Convert obraz (image bytes) to base64 string for JSON serialization
        if paragon and len(paragon) > 0 and paragon[0].get('obraz'):
            obraz_data = paragon[0]['obraz']
            if isinstance(obraz_data, bytes):
                paragon[0]['obraz'] = base64.b64encode(obraz_data).decode('utf-8')
        
        # Log działania
        user_status = get_user_status(id_uzytkownika)
        log_user_action(
            id_uzytkownika,
            "view_receipt_details",
            user_status,
            json.dumps({"id_paragonu": id_paragonu}, ensure_ascii=False)
        )
        
        print(json.dumps(paragon, ensure_ascii=False))
        return json.dumps(paragon, ensure_ascii=False)
    
    @staticmethod
    def produkty(id_uzytkownika, id_paragonu):
        produkty = DatabaseHelper.fetch_all("""SELECT 
            `p`.`id_produktu` AS `id_produktu`,
            `p`.`nazwa` AS `nazwa_produktu`,
            `p`.`cena`,
            `p`.`cenajednostkowa`,
            `p`.`ilosc`,
            `p`.`jednostka`,
            `p`.`typ_podatku` AS `typ_podatku`,
            `k`.`nazwa` AS `nazwa_kategorii`
        FROM 
            `produkty` AS `p`
        JOIN 
            `kategorie` AS `k` ON `p`.`id_kategorii` = `k`.`id_kategorii`
        WHERE 
            `p`.`id_paragonu` = :id_paragonu
            AND `p`.`id_paragonu` IN (
                SELECT `id_paragonu` 
                FROM `paragony` 
                WHERE `id_uzytkownika` = :id_uzytkownika
         )""", {"id_paragonu": id_paragonu, "id_uzytkownika": id_uzytkownika})
        
        # Log działania
        user_status = get_user_status(id_uzytkownika)
        log_user_action(
            id_uzytkownika,
            "view_products_list",
            user_status,
            json.dumps({"id_paragonu": id_paragonu, "count": len(produkty) if produkty else 0}, ensure_ascii=False)
        )
        
        print(json.dumps(produkty, ensure_ascii=False))
        return json.dumps(produkty, ensure_ascii=False)
        
    @staticmethod
    @staticmethod
    def update_paragon(id_paragonu, updated_data):
        try:
            print(updated_data)
            # Pobierz id_uzytkownika dla logowania
            paragon_owner = DatabaseHelper.fetch_one(
                "SELECT id_uzytkownika FROM paragony WHERE id_paragonu = :id_paragonu",
                {'id_paragonu': id_paragonu}
            )
            id_uzytkownika = paragon_owner['id_uzytkownika'] if paragon_owner else None
            
            # pobierz z bazy danych id_firmy dla nazwy firmy
            firma = DatabaseHelper.fetch_one(
                "SELECT id_firmy FROM firmy WHERE nazwa = :nazwa",
                {'nazwa': updated_data['nazwa_Firmy']}
            )
            if not firma:
                return jsonify({'status': 'error', 'message': 'Company not found.'})
            id_firmy = firma['id_firmy']
            
            # pobierz z bazy danych id_miasta dla nazwy miasta
            miasto = DatabaseHelper.fetch_one(
                "SELECT id_miasta FROM miasta WHERE nazwa = :nazwa",
                {'nazwa': updated_data['nazwa_Miasta']}
            )
            if not miasto:
                return jsonify({'status': 'error', 'message': 'City not found.'})
            id_miasta = miasto['id_miasta']
            
            # pobierz wszystkie ceny produktów z paragonu i zaktualizuj sumęZOperacji
            ceny = DatabaseHelper.fetch_all(
                "SELECT cena FROM produkty WHERE id_paragonu = :id_paragonu",
                {'id_paragonu': id_paragonu}
            )
            suma = sum(cena['cena'] for cena in ceny)
            
            print(id_firmy)
            print(id_miasta)
            DatabaseHelper.execute("""
                UPDATE paragony 
                SET 
                    id_firmy = :id_firmy,
                    id_miasta = :id_miasta,
                    ulica = :ulica, 
                    suma = :suma,
                    sumaZOperacji = :sumaZOperacji, 
                    rabat = :rabat, 
                    opis = :opis 
                WHERE 
                    id_paragonu = :id_paragonu
            """, {
                'id_firmy': id_firmy,
                'id_miasta': id_miasta,
                'ulica': updated_data['ulica'],
                'suma': updated_data['suma'],
                'sumaZOperacji': suma,
                'rabat': updated_data['rabat'],
                'opis': updated_data['opis'],
                'id_paragonu': id_paragonu
            })
            
            # Log działania
            if id_uzytkownika:
                user_status = get_user_status(id_uzytkownika)
                log_user_action(
                    id_uzytkownika,
                    "update_receipt",
                    user_status,
                    json.dumps({"id_paragonu": id_paragonu, "changes": updated_data}, ensure_ascii=False)
                )
            
            return jsonify({'status': 'success', 'message': 'Receipt updated successfully.'})
        except Exception as e:
            print(e)
            return jsonify({'status': 'error', 'message': str(e)})
        
    @staticmethod
    def update_sumaZOperacji(id_produktu):
        try:
            # pobierz id paragonu po id produktu
            result = DatabaseHelper.fetch_one(
                "SELECT id_paragonu FROM produkty WHERE id_produktu = :id_produktu",
                {'id_produktu': id_produktu}
            )
            if not result:
                return jsonify({'status': 'error', 'message': 'Product not found.'})
            
            id_paragonu = result['id_paragonu']
            
            # pobierz wszystkie ceny produktów z paragonu
            ceny = DatabaseHelper.fetch_all(
                "SELECT cena FROM produkty WHERE id_paragonu = :id_paragonu",
                {'id_paragonu': id_paragonu}
            )
            
            suma = sum(cena['cena'] for cena in ceny)
            
            # zaktualizuj sumęZOperacji
            DatabaseHelper.execute("""UPDATE paragony 
                SET sumaZOperacji = :suma
                WHERE id_paragonu = :id_paragonu
            """, {'suma': suma, 'id_paragonu': id_paragonu})
            
            return jsonify({'status': 'success', 'message': 'Receipt updated successfully.'})
        except Exception as e:
            print(e)
            return jsonify({'status': 'error', 'message': str(e)})

    @staticmethod
    def update_produkt(id_produktu, updated_data):
        print(updated_data)
        try:
            # Pobierz id_uzytkownika dla logowania
            produkt_owner = DatabaseHelper.fetch_one(
                """SELECT p.id_uzytkownika 
                   FROM produkty pr 
                   JOIN paragony p ON pr.id_paragonu = p.id_paragonu 
                   WHERE pr.id_produktu = :id_produktu""",
                {'id_produktu': id_produktu}
            )
            id_uzytkownika = produkt_owner['id_uzytkownika'] if produkt_owner else None
            
            # pobierz z bazy danych id_kategorii dla nazwy kategorii
            kategoria = DatabaseHelper.fetch_one(
                "SELECT id_kategorii FROM kategorie WHERE nazwa = :nazwa",
                {'nazwa': updated_data['nazwa_Kategorii']}
            )
            if not kategoria:
                return jsonify({'status': 'error', 'message': 'Category not found.'})
            id_kategorii = kategoria['id_kategorii']
            print(id_kategorii)
            
            DatabaseHelper.execute("""
                UPDATE produkty 
                SET 
                    nazwa = :nazwa, 
                    cena = :cena, 
                    ilosc = :ilosc, 
                    jednostka = :jednostka,
                    typ_podatku = :typ_podatku,
                    id_kategorii = :id_kategorii
                WHERE 
                    id_produktu = :id_produktu
            """, {
                'nazwa': updated_data['nazwa_Produktu'],
                'cena': updated_data['cena'],
                'ilosc': updated_data['ilosc'],
                'jednostka': updated_data['jednostka'],
                'typ_podatku': updated_data['typ_Podatku'],
                'id_kategorii': id_kategorii,
                'id_produktu': id_produktu
            })
            Api.update_sumaZOperacji(id_produktu)
            
            # Log działania
            if id_uzytkownika:
                user_status = get_user_status(id_uzytkownika)
                log_user_action(
                    id_uzytkownika,
                    "update_product",
                    user_status,
                    json.dumps({"id_produktu": id_produktu, "changes": updated_data}, ensure_ascii=False)
                )
            
            return jsonify({'status': 'success', 'message': 'Product updated successfully.'})
        except Exception as e:
            print(e)
            print('error')
            return jsonify({'status': 'error', 'message': str(e)})
    
    @staticmethod
    def kasujParagon(id_paragonu):
        try:
            # Pobierz id_uzytkownika przed usunięciem
            paragon_owner = DatabaseHelper.fetch_one(
                "SELECT id_uzytkownika FROM paragony WHERE id_paragonu = :id_paragonu",
                {'id_paragonu': id_paragonu}
            )
            id_uzytkownika = paragon_owner['id_uzytkownika'] if paragon_owner else None
            
            DatabaseHelper.execute("DELETE FROM produkty WHERE id_paragonu = :id_paragonu", {'id_paragonu': id_paragonu})
            DatabaseHelper.execute("DELETE FROM paragony WHERE id_paragonu = :id_paragonu", {'id_paragonu': id_paragonu})
            
            # Log działania
            if id_uzytkownika:
                user_status = get_user_status(id_uzytkownika)
                log_user_action(
                    id_uzytkownika,
                    "delete_receipt",
                    user_status,
                    json.dumps({"id_paragonu": id_paragonu}, ensure_ascii=False)
                )
            
            return jsonify({'status': 'success', 'message': 'Receipt deleted successfully.'})
        except Exception as e:
            print(e)
            return jsonify({'status': 'error', 'message': str(e)})
        
    @staticmethod
    def kasujProdukt(id_produktu):
        try:
            # Pobierz id_uzytkownika przed usunięciem
            produkt_owner = DatabaseHelper.fetch_one(
                """SELECT p.id_uzytkownika, pr.nazwa 
                   FROM produkty pr 
                   JOIN paragony p ON pr.id_paragonu = p.id_paragonu 
                   WHERE pr.id_produktu = :id_produktu""",
                {'id_produktu': id_produktu}
            )
            id_uzytkownika = produkt_owner['id_uzytkownika'] if produkt_owner else None
            nazwa_produktu = produkt_owner['nazwa'] if produkt_owner else None
            
            DatabaseHelper.execute("DELETE FROM produkty WHERE id_produktu = :id_produktu", {'id_produktu': id_produktu})
            
            # Log działania
            if id_uzytkownika:
                user_status = get_user_status(id_uzytkownika)
                log_user_action(
                    id_uzytkownika,
                    "delete_product",
                    user_status,
                    json.dumps({"id_produktu": id_produktu, "nazwa": nazwa_produktu}, ensure_ascii=False)
                )
            
            return jsonify({'status': 'success', 'message': 'Product deleted successfully.'})
        except Exception as e:
            print(e)
            return jsonify({'status': 'error', 'message': str(e)})
        
    @staticmethod
    def pobierzKategorie():
        try:
            kategorie = DatabaseHelper.fetch_all("SELECT * FROM kategorie", {})
            return json.dumps(kategorie, ensure_ascii=False)
        except Exception as e:
            print(e)
            return jsonify({'status': 'error', 'message': str(e)})
        
    @staticmethod
    def pobierzMiasta():
        try:
            miasta = DatabaseHelper.fetch_all("SELECT * FROM miasta", {})
            return json.dumps(miasta, ensure_ascii=False)
        except Exception as e:
            print(e)
            return jsonify({'status': 'error', 'message': str(e)})
        
    @staticmethod
    def pobierzFirmy():
        try:
            firmy = DatabaseHelper.fetch_all("SELECT * FROM firmy", {})
            return json.dumps(firmy, ensure_ascii=False)
        except Exception as e:
            print(e)
            return jsonify({'status': 'error', 'message': str(e)})
    
    @staticmethod
    def produktyUser(id_uzytkownika):
        limity = DatabaseHelper.fetch_all("""SELECT
    k.nazwa AS NazwaKategorii,
    SUM(p.cena) AS SumaCen
FROM
    produkty p
JOIN
    kategorie k ON p.id_kategorii = k.id_kategorii
JOIN
    paragony pr ON p.id_paragonu = pr.id_paragonu
WHERE pr.id_uzytkownika = :id_uzytkownika 
GROUP BY
    k.nazwa""", {'id_uzytkownika': id_uzytkownika})
        print(json.dumps(limity, ensure_ascii=False))
        return json.dumps(limity, ensure_ascii=False)
    
    @staticmethod
    def dodajLimitNaKategorie(id_uzytkownika, id_kategorii, limity):
        try:
            limity1 = DatabaseHelper.fetch_all("""
            SELECT * FROM limity WHERE id_uzytkownika = :id_uzytkownika AND id_kategorii = :id_kategorii;
            """, {'id_uzytkownika': id_uzytkownika, 'id_kategorii': id_kategorii})
            
            print(limity1)
            action_type = "create_limit"
            # jeśli nie ma limitu to dodaj
            if len(limity1) == 0:
                DatabaseHelper.execute(
                    """INSERT INTO limity (id_uzytkownika, id_kategorii, limity) VALUES (:id_uzytkownika, :id_kategorii, :limity);""",
                    {'id_uzytkownika': id_uzytkownika, 'id_kategorii': id_kategorii, 'limity': limity}
                )
            else:
                action_type = "update_limit"
                DatabaseHelper.execute(
                    """UPDATE limity SET limity = :limity WHERE id_uzytkownika = :id_uzytkownika AND id_kategorii = :id_kategorii;""",
                    {'limity': limity, 'id_uzytkownika': id_uzytkownika, 'id_kategorii': id_kategorii}
                )
            
            # Log działania
            user_status = get_user_status(id_uzytkownika)
            log_user_action(
                id_uzytkownika,
                action_type,
                user_status,
                json.dumps({"id_kategorii": id_kategorii, "limit": limity}, ensure_ascii=False)
            )
            
            return jsonify({'status': 'success', 'message': 'Product updated successfully.'})
        except Exception as e:
            print(e)
            print('error')
            return jsonify({'status': 'error', 'message': str(e)})
        
    @staticmethod
    def produktyUser1(id_uzytkownika):
        modified_limity = DatabaseHelper.fetch_all("""SELECT
    l.id,
    l.id_uzytkownika,
    l.id_kategorii,
    l.limity AS "Limit",
    k.nazwa AS NazwaKategorii,
    COALESCE(s.Wydano, 0) AS Wydano
FROM
    limity l
JOIN
    kategorie k ON l.id_kategorii = k.id_kategorii
LEFT JOIN (
    SELECT
        pr.id_uzytkownika,
        p.id_kategorii,
        SUM(p.cena) AS Wydano
    FROM
        produkty p
    JOIN
        paragony pr ON p.id_paragonu = pr.id_paragonu
    WHERE
        pr.id_uzytkownika = :id_uzytkownika
        AND MONTH(pr.data_dodania) = MONTH(CURDATE())
        AND YEAR(pr.data_dodania) = YEAR(CURDATE())
    GROUP BY
        pr.id_uzytkownika, p.id_kategorii
) s ON l.id_uzytkownika = s.id_uzytkownika AND l.id_kategorii = s.id_kategorii
WHERE
    l.id_uzytkownika = :id_uzytkownika""", {'id_uzytkownika': id_uzytkownika})

        # Generate notifications when spending reaches defined thresholds
        for limit in modified_limity:
            try:
                limit_value = float(limit.get('Limit') or 0)
                spent_value = float(limit.get('Wydano') or 0)
            except (TypeError, ValueError):
                continue

            if limit_value <= 0:
                continue

            ratio = spent_value / limit_value
            message = None

            category_name = (limit.get('NazwaKategorii') or '').strip()

            if ratio >= 1:
                message = f"Przekroczyłeś swój limit dla kategorii {category_name}"
            elif ratio >= 0.75:
                message = f"Wykorzystałeś ponad 75% limitu dla kategorii {category_name}"

            limit_id = limit.get('id')
            if message and limit_id:
                Api.dodaj_powiadomienie(limit_id, message, id_uzytkownika)

        print(json.dumps(modified_limity, ensure_ascii=False))
        return json.dumps(modified_limity, ensure_ascii=False)
    
    @staticmethod
    def kasujLimit(id):
        try:
            # Pobierz id_uzytkownika przed usunięciem
            limit_owner = DatabaseHelper.fetch_one(
                "SELECT id_uzytkownika, id_kategorii FROM limity WHERE id = :id",
                {'id': id}
            )
            id_uzytkownika = limit_owner['id_uzytkownika'] if limit_owner else None
            id_kategorii = limit_owner['id_kategorii'] if limit_owner else None
            
            DatabaseHelper.execute("DELETE FROM limity WHERE id = :id", {'id': id})
            
            # Log działania
            if id_uzytkownika:
                user_status = get_user_status(id_uzytkownika)
                log_user_action(
                    id_uzytkownika,
                    "delete_limit",
                    user_status,
                    json.dumps({"id_limitu": id, "id_kategorii": id_kategorii}, ensure_ascii=False)
                )
            
            return jsonify({'status': 'success', 'message': 'Product deleted successfully.'})
        except Exception as e:
            print(e)
            return jsonify({'status': 'error', 'message': str(e)})
        
    @staticmethod
    def update_limit(limit, nazwaKategorii, id_uzytkownika):
        try:
            # pobierz z bazy danych id_kategorii dla nazwy kategorii
            kategoria = DatabaseHelper.fetch_one(
                "SELECT * from kategorie WHERE nazwa = :nazwa",
                {'nazwa': nazwaKategorii}
            )
            if not kategoria:
                return jsonify({'status': 'error', 'message': 'Category not found.'})
            
            id_kategorii = kategoria['id_kategorii']
            DatabaseHelper.execute(
                "UPDATE limity SET limity = :limit WHERE id_uzytkownika = :id_uzytkownika AND id_kategorii = :id_kategorii",
                {'limit': limit, 'id_uzytkownika': id_uzytkownika, 'id_kategorii': id_kategorii}
            )
            return jsonify({'status': 'success', 'message': 'Limit updated successfully.'})
        except Exception as e:
            print(e)
            print('error')
            return jsonify({'status': 'error', 'message': str(e)})
        
    @staticmethod
    @staticmethod
    def dodaj_powiadomienie(id_limitu, tresc, id_uzytkownika):
        DatabaseHelper.execute("""
        INSERT INTO powiadomienia (id_limitu, tresc, data_utworzenia, id_uzytkownika) 
        VALUES (:id_limitu, :tresc, NOW(), :id_uzytkownika)
        ON DUPLICATE KEY UPDATE data_utworzenia = NOW()
        """, {
            'id_limitu': id_limitu,
            'tresc': tresc,
            'id_uzytkownika': id_uzytkownika
        })

    @staticmethod
    def limitDelete(id):
        try:
            # Najpierw usuń powiadomienia powiązane z limitem
            DatabaseHelper.execute("DELETE FROM powiadomienia WHERE id_limitu = :id", {'id': id})
            DatabaseHelper.execute("DELETE FROM limity WHERE id = :id", {'id': id})
            return jsonify({'message': 'Limit został usunięty'}), 200
        except Exception as e:
            DatabaseHelper.rollback()
            print(f"Błąd podczas usuwania limitu: {e}")
            return jsonify({'error': 'Wystąpił błąd podczas usuwania limitu'}), 500
        
    @staticmethod
    @staticmethod
    def pobierz_powiadomienia(id_uzytkownika):
        powiadomienia = DatabaseHelper.fetch_all("""
            SELECT powiadomienia.tresc, powiadomienia.data_utworzenia, kategorie.nazwa, limity.id_uzytkownika
            FROM powiadomienia
            JOIN limity ON powiadomienia.id_limitu = limity.id
            JOIN kategorie ON limity.id_kategorii = kategorie.id_kategorii
            WHERE powiadomienia.id_uzytkownika = :id_uzytkownika
            ORDER BY powiadomienia.data_utworzenia DESC
        """, {'id_uzytkownika': id_uzytkownika})
        return json.dumps(powiadomienia, default=str, ensure_ascii=False)
    
    @staticmethod
    @staticmethod
    def pobierzParagonyPoFirmie(nazwaFirmy, id_uzytkownika):
        try:
            query = """
                SELECT 
                    p.id_paragonu,
                    f.nazwa AS nazwa_firmy,
                    m.nazwa AS nazwa_miasta,
                    m.kod_pocztowy AS kod_pocztowy,
                    p.ulica,
                    p.suma,
                    p.rabat,
                    p.opis,
                    p.data_dodania,
                    COUNT(pr.id_produktu) AS liczba_produktow
                FROM paragony p 
                JOIN firmy f ON p.id_firmy = f.id_firmy
                JOIN miasta m ON p.id_miasta = m.id_miasta
                LEFT JOIN produkty pr ON p.id_paragonu = pr.id_paragonu
                WHERE f.nazwa = :nazwaFirmy AND p.id_uzytkownika = :id_uzytkownika
                GROUP BY p.id_paragonu, f.nazwa, m.nazwa, m.kod_pocztowy, p.ulica, p.suma, p.rabat, p.opis, p.data_dodania
                ORDER BY p.data_dodania DESC
            """
            firmy = DatabaseHelper.fetch_all(query, {'nazwaFirmy': nazwaFirmy, 'id_uzytkownika': id_uzytkownika})
            return json.dumps(firmy, ensure_ascii=False)
        except Exception as e:
            print(e)
            return jsonify({'status': 'error', 'message': str(e)})
        
    @staticmethod
    def paragonyDlaDanejFirmy(id_uzytkownika, nazwa_firmy):
        query = """SELECT p.id_paragonu,
        f.nazwa AS nazwa_firmy,
        m.nazwa AS nazwa_miasta,
        m.kod_pocztowy AS kod_pocztowy,
        p.ulica,
        p.suma,
        p.rabat,
        p.opis,
        p.data_dodania 
        FROM paragony p 
        JOIN firmy f ON p.id_firmy = f.id_firmy
        JOIN miasta m ON p.id_miasta = m.id_miasta
        WHERE
        p.id_uzytkownika = :id_uzytkownika AND f.nazwa = :nazwa_firmy
        ORDER BY 
        p.id_paragonu DESC;"""

        paragony = DatabaseHelper.fetch_all(query, {'id_uzytkownika': id_uzytkownika, 'nazwa_firmy': nazwa_firmy})
        return json.dumps(paragony, ensure_ascii=False)
    
    @staticmethod
    def produktyDlaParagonu(id_uzytkownika):
        query = """
            SELECT 
                produkty.id_produktu,
                produkty.nazwa AS nazwa,
                produkty.cena,
                firmy.nazwa AS nazwa_firmy,
                paragony.data_dodania,
                paragony.id_paragonu
            FROM paragony
            JOIN produkty ON paragony.id_paragonu = produkty.id_paragonu
            JOIN firmy ON paragony.id_firmy = firmy.id_firmy
            WHERE paragony.id_uzytkownika = :id_uzytkownika;
        """
        paragony = DatabaseHelper.fetch_all(query, {'id_uzytkownika': id_uzytkownika})
        return json.dumps(paragony, ensure_ascii=False)

    
    @staticmethod
    def raport(id_uzytkownika, start_date_str, end_date_str):
        try:
            query = """
                SELECT k.nazwa AS kategoria, DATE(par.data_dodania) AS data, SUM(p.cena) AS suma_cen
                FROM produkty p
                JOIN kategorie k ON p.id_kategorii = k.id_kategorii
                JOIN paragony par ON p.id_paragonu = par.id_paragonu
                WHERE par.id_uzytkownika = :id_uzytkownika
            """
            params = {'id_uzytkownika': id_uzytkownika}
            
            if start_date_str:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                query += " AND DATE(par.data_dodania) >= :start_date"
                params['start_date'] = start_date
            if end_date_str:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                query += " AND DATE(par.data_dodania) <= :end_date"
                params['end_date'] = end_date

            query += """
                GROUP BY k.nazwa, DATE(par.data_dodania)
                ORDER BY data ASC, suma_cen DESC;
            """
            raport = DatabaseHelper.fetch_all(query, params)
            
            # Log działania
            user_status = get_user_status(id_uzytkownika)
            log_user_action(
                id_uzytkownika,
                "generate_report",
                user_status,
                json.dumps({"start_date": start_date_str, "end_date": end_date_str, "records_count": len(raport) if raport else 0}, ensure_ascii=False)
            )
            
            return json.dumps(raport, ensure_ascii=False)
        except ValueError:
            return jsonify(error="Nieprawidłowy format daty. Użyj YYYY-MM-DD."), 400
        except Exception as e:
            print(f"Błąd: {e}")
            return jsonify(error=str(e)), 500
    


    @staticmethod
    def raport_z_filtrem(id_uzytkownika, start_date_str, end_date_str, category_ids_str):
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            category_ids = [int(x) for x in category_ids_str.split(',')] if category_ids_str else []

            query = """
                SELECT k.nazwa AS kategoria, SUM(p.cena) AS suma_cen
                FROM produkty p
                JOIN kategorie k ON p.id_kategorii = k.id_kategorii
                JOIN paragony par ON p.id_paragonu = par.id_paragonu
                WHERE par.id_uzytkownika = :id_uzytkownika
                AND DATE(par.data_dodania) BETWEEN :start_date AND :end_date
            """
            params = {'id_uzytkownika': id_uzytkownika, 'start_date': start_date, 'end_date': end_date}
            
            if category_ids:
                placeholders = ','.join([f':cat{i}' for i in range(len(category_ids))])
                query += f" AND k.id_kategorii IN ({placeholders})"
                for i, cat_id in enumerate(category_ids):
                    params[f'cat{i}'] = cat_id

            query += """
                GROUP BY k.nazwa
                ORDER BY suma_cen DESC;
            """
            raport = DatabaseHelper.fetch_all(query, params)
            return json.dumps(raport, ensure_ascii=False)
        except Exception as e:
            print(f"Błąd w raporcie z filtrem: {e}")
            return jsonify(error=str(e)), 500
        
    @staticmethod
    def produktyDlaKategorii(id_uzytkownika, id_kategorii):
        paragony = DatabaseHelper.fetch_all("""SELECT 
    produkty.nazwa,
    produkty.cenajednostkowa,
    produkty.ilosc,
    produkty.jednostka,
    paragony.data_dodania
FROM 
    produkty AS produkty
JOIN 
    paragony AS paragony
    ON produkty.id_paragonu = paragony.id_paragonu
WHERE 
    paragony.id_uzytkownika = :id_uzytkownika
    AND produkty.id_kategorii = :id_kategorii""", {'id_uzytkownika': id_uzytkownika, 'id_kategorii': id_kategorii})
        print(json.dumps(paragony, ensure_ascii=False))
        return json.dumps(paragony, ensure_ascii=False)

    @staticmethod
    def pobierzRaportWydatkowKategorieMiesiace(id_uzytkownika, id_kategorii, months=None):
        try:
            query = """
                SELECT
                    DATE_FORMAT(par.data_dodania, '%%Y-%%m') AS miesiac,
                    SUM(p.cena) AS suma_cen
                FROM produkty p
                JOIN kategorie k ON p.id_kategorii = k.id_kategorii
                JOIN paragony par ON p.id_paragonu = par.id_paragonu
                WHERE par.id_uzytkownika = :id_uzytkownika AND p.id_kategorii = :id_kategorii
            """
            params = {'id_uzytkownika': id_uzytkownika, 'id_kategorii': id_kategorii}

            if months:
                today = datetime.now()
                first = today.replace(day=1)
                cutoff_date = first - timedelta(days=months * 30)
                query += " AND par.data_dodania >= :cutoff_date"
                params['cutoff_date'] = cutoff_date

            query += """
                GROUP BY DATE_FORMAT(par.data_dodania, '%%Y-%%m')
                ORDER BY DATE_FORMAT(par.data_dodania, '%%Y-%%m')
            """
            print("Query: ", query)
            print("Params: ", params)
            raport = DatabaseHelper.fetch_all(query, params)

            # Formatowanie daty w Pythonie i konwersja do stringów
            print("Raport: ", raport)
            return json.dumps(raport, ensure_ascii=False)
        except Exception as e:
            print(f"Error in pobierzRaportWydatkowKategorieMiesiace: {e}")
            return jsonify({'status': 'error', 'message': str(e)}), 500
        
    @staticmethod
    def produktyHistoriaCen(id_uzytkownika, nazwa_produktu):
        try:
            print(nazwa_produktu)
            print(id_uzytkownika)
            nazwa_produktu_like = f"%{nazwa_produktu}%"
            produkty = DatabaseHelper.fetch_all(
                """SELECT nazwa, cena, data_dodania FROM produkty 
                JOIN paragony ON produkty.id_paragonu = paragony.id_paragonu 
                WHERE produkty.nazwa LIKE :nazwa AND paragony.id_uzytkownika = :id_uzytkownika 
                ORDER BY data_dodania DESC;""",
                {'nazwa': nazwa_produktu_like, 'id_uzytkownika': id_uzytkownika}
            )
            print(json.dumps(produkty, ensure_ascii=False))
            return json.dumps(produkty, ensure_ascii=False)
        except Exception as e:
            print(e)
            return jsonify({'status': 'error', 'message': str(e)})

    @staticmethod
    def _safe_float(value, default=0.0):
        try:
            if value is None:
                return default
            if isinstance(value, Decimal):
                return float(value)
            return float(value)
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _current_unit_price(item_row):
        unit_price = Api._safe_float(item_row.get('cenajednostkowa'))
        if unit_price > 0:
            return unit_price

        cena = Api._safe_float(item_row.get('cena'))
        ilosc_paragon = Api._safe_float(item_row.get('ilosc_paragon'), 1.0)
        if ilosc_paragon <= 0:
            ilosc_paragon = 1.0
        if cena <= 0:
            return 0.0
        return cena / ilosc_paragon

    @staticmethod
    @staticmethod
    def fetch_shopping_list_items(id_uzytkownika, id_listy):
        items = DatabaseHelper.fetch_all(
            """
                SELECT 
                    l.id_listy,
                    l.id_produktu,
                    l.ilosc AS ilosc_lista,
                    p.nazwa,
                    p.cena,
                    p.ilosc AS ilosc_paragon,
                    p.cenajednostkowa,
                    COALESCE(p.jednostka, '') AS jednostka,
                    f.nazwa AS sklep
                FROM listy l
                JOIN produkty p ON l.id_produktu = p.id_produktu
                JOIN paragony pa ON p.id_paragonu = pa.id_paragonu
                JOIN firmy f ON pa.id_firmy = f.id_firmy
                WHERE l.id_uzytkownika = :id_uzytkownika AND l.id_listy = :id_listy
                ORDER BY p.nazwa
            """,
            {'id_uzytkownika': id_uzytkownika, 'id_listy': id_listy}
        )
        return items

    @staticmethod
    def build_shopping_list_summary(id_uzytkownika, id_listy, list_items=None):
        if list_items is None:
            list_items = Api.fetch_shopping_list_items(id_uzytkownika, id_listy)

        if not list_items:
            return {
                'listId': id_listy,
                'requestedItems': 0,
                'currentEstimatedTotal': 0.0,
                'bestPerProductTotal': 0.0,
                'recommendedStrategy': 'none',
                'productInsights': [],
                'storeRecommendations': {
                    'bestStore': None,
                    'storeTotals': [],
                    'missingPrices': []
                },
                'generatedAt': datetime.utcnow().isoformat() + 'Z'
            }

        normalized_names = {}
        for item in list_items:
            raw_name = (item.get('nazwa') or '').strip()
            if not raw_name:
                continue
            normalized = raw_name.strip()
            normalized_names[normalized.lower()] = raw_name

        historical_prices = {key: [] for key in normalized_names.keys()}
        if historical_prices:
            keys_list = list(historical_prices.keys())
            placeholders = ','.join([f':key{i}' for i in range(len(keys_list))])
            query = f"""
                SELECT 
                    LOWER(TRIM(p_hist.nazwa)) AS product_key,
                    f.nazwa AS store,
                    AVG(
                        CASE
                            WHEN p_hist.cenajednostkowa IS NOT NULL AND p_hist.cenajednostkowa > 0 THEN p_hist.cenajednostkowa
                            WHEN p_hist.ilosc IS NOT NULL AND p_hist.ilosc > 0 THEN p_hist.cena / p_hist.ilosc
                            ELSE p_hist.cena
                        END
                    ) AS unit_price
                FROM produkty p_hist
                JOIN paragony pa_hist ON p_hist.id_paragonu = pa_hist.id_paragonu
                JOIN firmy f ON pa_hist.id_firmy = f.id_firmy
                WHERE LOWER(TRIM(p_hist.nazwa)) IN ({placeholders})
                GROUP BY product_key, f.nazwa
                HAVING unit_price IS NOT NULL AND unit_price > 0
            """
            params = {f'key{i}': key for i, key in enumerate(keys_list)}
            price_rows = DatabaseHelper.fetch_all(query, params)

            for row in price_rows:
                product_key = (row.get('product_key') or '').strip()
                if not product_key or product_key not in historical_prices:
                    continue
                unit_price = Api._safe_float(row.get('unit_price'))
                if unit_price <= 0:
                    continue
                historical_prices[product_key].append({
                    'store': row.get('store'),
                    'unit_price': unit_price
                })

        product_insights = []
        store_stats = {}
        missing_products = []
        total_current = 0.0
        total_best = 0.0
        total_items = len(list_items)

        for item in list_items:
            raw_name = (item.get('nazwa') or '').strip()
            normalized = raw_name.strip().lower() if raw_name else ''
            requested_qty = Api._safe_float(item.get('ilosc_lista'), 1.0)
            if requested_qty <= 0:
                requested_qty = 1.0

            current_unit_price = Api._current_unit_price(item)
            current_total = current_unit_price * requested_qty
            total_current += current_total

            store_options = []
            for option in historical_prices.get(normalized, []):
                unit_price = option['unit_price']
                total_price = unit_price * requested_qty
                store_options.append({
                    'store': option['store'],
                    'unit_price': round(unit_price, 2),
                    'total_price': round(total_price, 2)
                })

                stats = store_stats.setdefault(option['store'], {
                    'store': option['store'],
                    'total_cost': 0.0,
                    'covered_items': 0
                })
                stats['total_cost'] += total_price
                stats['covered_items'] += 1

            store_options.sort(key=lambda opt: opt['total_price'])
            best_option = store_options[0] if store_options else None
            if best_option:
                total_best += best_option['total_price']
            else:
                missing_products.append(raw_name)

            product_insights.append({
                'productId': item.get('id_produktu'),
                'name': raw_name,
                'unit': item.get('jednostka'),
                'requestedQuantity': round(requested_qty, 2),
                'currentStore': item.get('sklep'),
                'currentUnitPrice': round(current_unit_price, 2),
                'currentTotalPrice': round(current_total, 2),
                'bestOption': best_option,
                'storeOptions': store_options
            })

        store_totals = []
        for stats in store_stats.values():
            covered = stats['covered_items']
            missing = total_items - covered
            store_totals.append({
                'store': stats['store'],
                'total_cost': round(stats['total_cost'], 2),
                'covered_items': covered,
                'missing_items': missing,
                'coverage': round(covered / total_items, 2) if total_items else 0.0
            })

        store_totals.sort(key=lambda item: (-item['covered_items'], item['total_cost']))
        best_store = next((item for item in store_totals if item['missing_items'] == 0), None)
        if not best_store and store_totals:
            best_store = store_totals[0]

        strategy = 'per_product'
        if best_store and best_store['missing_items'] == 0:
            strategy = 'single_store'
        elif total_best <= 0:
            strategy = 'none'

        summary = {
            'listId': id_listy,
            'requestedItems': total_items,
            'currentEstimatedTotal': round(total_current, 2),
            'bestPerProductTotal': round(total_best, 2),
            'recommendedStrategy': strategy,
            'recommendedStore': best_store,
            'productInsights': product_insights,
            'storeRecommendations': {
                'bestStore': best_store,
                'storeTotals': store_totals,
                'missingPrices': missing_products
            },
            'generatedAt': datetime.utcnow().isoformat() + 'Z'
        }

        return summary
    
    @staticmethod
    def pobierz_logi(id_uzytkownika, page=0, size=50, details_search=None, 
                     date_from=None, date_to=None, user_status=None, action=None):
        """
        Pobiera logi użytkownika z paginacją i filtrowaniem
        
        :param id_uzytkownika: ID użytkownika
        :param page: Numer strony (domyślnie 0)
        :param size: Liczba wyników na stronę (domyślnie 50)
        :param details_search: Tekst do wyszukania w kolumnie details (opcjonalny)
        :param date_from: Data początkowa filtrowania (format: YYYY-MM-DD lub YYYY-MM-DD HH:MM:SS)
        :param date_to: Data końcowa filtrowania (format: YYYY-MM-DD lub YYYY-MM-DD HH:MM:SS)
        :param user_status: Status użytkownika do filtrowania (opcjonalny)
        :param action: Akcja do filtrowania (opcjonalny)
        :return: Lista logów w formacie JSON
        """
        offset = page * size
        
        # Budowanie zapytania z warunkami
        where_clauses = ["l.id_uzytkownika = :id_uzytkownika"]
        params = {
            "id_uzytkownika": id_uzytkownika,
            "size": size,
            "offset": offset
        }
        
        # Filtr po details (wyszukiwanie częściowe)
        if details_search:
            where_clauses.append("l.details LIKE :details_search")
            params["details_search"] = f"%{details_search}%"
        
        # Filtr po dacie początkowej
        if date_from:
            where_clauses.append("l.timestamp >= :date_from")
            params["date_from"] = date_from
        
        # Filtr po dacie końcowej
        if date_to:
            where_clauses.append("l.timestamp <= :date_to")
            params["date_to"] = date_to
        
        # Filtr po statusie użytkownika
        if user_status:
            where_clauses.append("l.user_status_at_log = :user_status")
            params["user_status"] = user_status
        
        # Filtr po akcji
        if action:
            where_clauses.append("l.action = :action")
            params["action"] = action
        
        query = f"""
            SELECT 
                l.id,
                l.id_uzytkownika,
                l.timestamp,
                l.action,
                l.user_status_at_log,
                l.details
            FROM 
                logi l
            WHERE 
                {' AND '.join(where_clauses)}
            ORDER BY 
                l.timestamp DESC
            LIMIT :size OFFSET :offset
        """
        
        logi = DatabaseHelper.fetch_all(query, params)
        
        # Konwersja timestamp do formatu ISO
        for log in logi:
            if log.get('timestamp'):
                # Sprawdź czy timestamp jest datetime object czy już stringiem
                if isinstance(log['timestamp'], datetime):
                    log['timestamp'] = log['timestamp'].isoformat()
                # Jeśli już jest stringiem, zostaw bez zmian
        
        return json.dumps(logi, ensure_ascii=False)
