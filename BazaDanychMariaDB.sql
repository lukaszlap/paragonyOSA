-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Paź 11, 2025 at 05:04 PM
-- Wersja serwera: 10.4.32-MariaDB
-- Wersja PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `paragony1`
--

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `firmy`
--

CREATE TABLE `firmy` (
  `id_firmy` int(11) NOT NULL,
  `nazwa` varchar(100) NOT NULL,
  `opis` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `firmy`
--

INSERT INTO `firmy` (`id_firmy`, `nazwa`, `opis`) VALUES
(1, 'Biedronka', 'Sieć supermarketów oferująca szeroki wybór produktów spożywczych i przemysłowych'),
(2, 'Lidl', 'Niemiecka sieć dyskontów spożywczych znana z niskich cen i produktów własnych marek'),
(3, 'Kaufland', 'Duża sieć hipermarketów oferująca szeroki asortyment produktów spożywczych i przemysłowych'),
(4, 'Carrefour', 'Francuska sieć hipermarketów i supermarketów, oferująca szeroki wybór produktów'),
(5, 'Netto', 'Duńska sieć dyskontów spożywczych oferująca produkty w konkurencyjnych cenach'),
(6, 'Auchan', 'Francuska sieć hipermarketów i supermarketów, oferująca szeroki wybór produktów'),
(7, 'Tesco', 'Brytyjska sieć supermarketów, znana z szerokiej gamy produktów i usług'),
(8, 'Polomarket', 'Polska sieć supermarketów oferująca produkty spożywcze i przemysłowe'),
(9, 'Dino', 'Polska sieć dyskontów spożywczych oferująca produkty w konkurencyjnych cenach'),
(10, 'Lewiatan', 'Polska sieć sklepów spożywczych oferująca szeroki wybór produktów'),
(11, 'Żabka', 'Polska sieć sklepów convenience oferująca szybkie zakupy spożywcze i artykuły codziennego użytku'),
(12, 'Intermarché', 'Francuska sieć supermarketów oferująca szeroki wybór produktów'),
(13, 'Aldi', 'Niemiecka sieć dyskontów spożywczych znana z niskich cen i produktów własnych marek'),
(14, 'Piotr i Paweł', 'Polska sieć supermarketów oferująca produkty premium i ekskluzywne'),
(15, 'E.Leclerc', 'Francuska sieć hipermarketów oferująca szeroki wybór produktów'),
(16, 'Selgros', 'Niemiecka sieć hurtowni spożywczych oferująca produkty w dużych opakowaniach'),
(17, 'Makro', 'Holenderska sieć hurtowni spożywczych oferująca produkty w dużych opakowaniach'),
(18, 'Mila', 'Polska sieć supermarketów oferująca produkty spożywcze i przemysłowe'),
(19, 'Delikatesy Centrum', 'Polska sieć sklepów oferująca produkty spożywcze i przemysłowe'),
(20, 'SPAR', 'Austriacka sieć supermarketów oferująca szeroki wybór produktów'),
(21, 'EuroSklep', 'Polska sieć sklepów oferująca produkty spożywcze i przemysłowe'),
(22, 'Topaz', 'Polska sieć sklepów oferująca produkty spożywcze i przemysłowe'),
(23, 'Groszek', 'Polska sieć sklepów oferująca produkty spożywcze i przemysłowe'),
(24, 'Orlen', 'Paliwa itp.'),
(25, 'TrudnoOkreslic', 'Trudno okreslic kategorie');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `kategorie`
--

CREATE TABLE `kategorie` (
  `id_kategorii` int(11) NOT NULL,
  `nazwa` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `kategorie`
--

INSERT INTO `kategorie` (`id_kategorii`, `nazwa`) VALUES
(1, 'Jedzenie'),
(2, 'Napoje'),
(3, 'Alkohol'),
(4, 'Elektronika'),
(5, 'Odzież'),
(6, 'Obuwie'),
(7, 'Kosmetyki'),
(8, 'Sport'),
(9, 'Dom'),
(10, 'Ogród'),
(11, 'Zabawki'),
(12, 'Książki'),
(13, 'Muzyka'),
(14, 'Filmy'),
(15, 'Gry'),
(16, 'Komputery'),
(17, 'Telefony'),
(18, 'Akcesoria'),
(19, 'Meble'),
(20, 'Dekoracje'),
(21, 'Narzędzia'),
(22, 'Materiały budowlane'),
(23, 'Komunikacja'),
(24, 'Medycyna'),
(25, 'Rower'),
(26, 'Usługi'),
(27, 'Transport'),
(28, 'Turystyka'),
(29, 'Restauracja'),
(30, 'Kawiarnia'),
(31, 'Zdrowie'),
(32, 'Ubezpieczenia'),
(33, 'Finanse'),
(34, 'Edukacja'),
(35, 'Kultura'),
(36, 'Sztuka'),
(37, 'Sport'),
(38, 'Hobby'),
(39, 'Zwierzęta'),
(40, 'Rośliny'),
(41, 'Chemia'),
(42, 'Farmacja'),
(43, 'Paliwa'),
(44, 'Energia'),
(45, 'Sprzęt AGD'),
(46, 'Sprzęt RTV'),
(47, 'Biuro'),
(48, 'Papiernictwo'),
(49, 'Biżuteria'),
(50, 'TrudnoOkreslic');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `limity`
--

CREATE TABLE `limity` (
  `id` int(11) NOT NULL,
  `id_uzytkownika` int(11) NOT NULL,
  `id_kategorii` int(11) NOT NULL,
  `limity` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `limity`
--



-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `lista`
--

CREATE TABLE `lista` (
  `id` int(11) NOT NULL,
  `id_uzytkownika` int(11) NOT NULL,
  `Data_Dodania` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lista`
--



-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `listy`
--

CREATE TABLE `listy` (
  `id` int(11) NOT NULL,
  `id_listy` int(11) NOT NULL,
  `id_produktu` int(11) DEFAULT NULL,
  `ilosc` int(11) NOT NULL,
  `id_uzytkownika` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `listy`
--


-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `miasta`
--

CREATE TABLE `miasta` (
  `id_miasta` int(11) NOT NULL,
  `nazwa` varchar(50) NOT NULL,
  `kod_pocztowy` varchar(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `miasta`
--

INSERT INTO `miasta` (`id_miasta`, `nazwa`, `kod_pocztowy`) VALUES
(1, 'Warszawa', '00-001'),
(2, 'Kraków', '30-001'),
(3, 'Gdańsk', '80-001'),
(4, 'Wrocław', '50-001'),
(5, 'Poznań', '60-001'),
(6, 'Szczecin', '70-001'),
(7, 'Bydgoszcz', '85-001'),
(8, 'Lublin', '20-001'),
(9, 'Białystok', '15-001'),
(10, 'Gdynia', '81-001'),
(11, 'Katowice', '40-001'),
(12, 'Łódź', '90-001'),
(13, 'Rzeszów', '35-001'),
(14, 'Toruń', '87-001'),
(15, 'Kielce', '25-001'),
(16, 'Olsztyn', '10-001'),
(17, 'Radom', '26-001'),
(18, 'Sosnowiec', '41-001'),
(19, 'Gliwice', '44-001'),
(20, 'Zabrze', '41-001'),
(21, 'Bielsko-Biała', '43-001'),
(22, 'Bytom', '41-001'),
(23, 'Chorzów', '41-001'),
(24, 'Dąbrowa Górnicza', '32-001'),
(25, 'Elbląg', '82-001'),
(26, 'Koszalin', '75-001'),
(27, 'Legnica', '59-001'),
(28, 'Lubin', '59-001'),
(29, 'Opole', '45-001'),
(30, 'Płock', '09-001'),
(31, 'Ruda Śląska', '41-001'),
(32, 'Rybnik', '44-001'),
(33, 'Siedlce', '08-001'),
(34, 'Słupsk', '76-001'),
(35, 'Tarnów', '33-001'),
(36, 'Tychy', '43-001'),
(37, 'Wałbrzych', '58-001'),
(38, 'Włocławek', '87-001'),
(39, 'Zielona Góra', '65-001'),
(40, 'Częstochowa', '42-001'),
(41, 'Głogów', '67-001'),
(42, 'Jelenia Góra', '58-001'),
(43, 'Kalisz', '62-001'),
(44, 'Konin', '62-001'),
(45, 'Legnica', '59-001'),
(46, 'Nowy Sącz', '33-001'),
(47, 'Ostrołęka', '07-001'),
(48, 'Piła', '64-001'),
(49, 'Piotrków Trybunalski', '97-001'),
(50, 'Przemyśl', '37-001'),
(51, 'Radom', '26-001'),
(52, 'Siedlce', '08-001'),
(53, 'Sieradz', '98-001'),
(54, 'Suwałki', '16-001'),
(55, 'Tarnowskie Góry', '42-001'),
(56, 'Tczew', '83-001'),
(57, 'Tomaszów Mazowiecki', '96-001'),
(58, 'Trzebnica', '55-001'),
(59, 'Wałbrzych', '58-001'),
(60, 'Wodzisław Śląski', '44-001'),
(61, 'Zamość', '22-001'),
(62, 'Zielona Góra', '65-001'),
(63, 'Żory', '44-001'),
(64, 'Chełm', '22-001'),
(65, 'Chojnice', '89-001'),
(66, 'Ciechanów', '06-001'),
(67, 'Dąbrowa Tarnowska', '34-001'),
(68, 'Ełk', '19-001'),
(69, 'Gniezno', '62-001'),
(70, 'Gorzów Wielkopolski', '66-001'),
(71, 'Inowrocław', '88-001'),
(72, 'Jaworzno', '43-001'),
(73, 'Kędzierzyn-Koźle', '47-001'),
(74, 'Kluczbork', '46-001'),
(75, 'Kołobrzeg', '78-001'),
(76, 'Krosno', '38-001'),
(77, 'Kutno', '99-001'),
(78, 'Lębork', '84-001'),
(79, 'Leszno', '64-001'),
(80, 'Łomża', '18-001'),
(81, 'Malbork', '82-001'),
(82, 'Mysłowice', '41-001'),
(83, 'Nysa', '48-001'),
(84, 'Olkusz', '32-001'),
(85, 'Ostrowiec Świętokrzyski', '26-001'),
(86, 'Pabianice', '95-001'),
(87, 'Piekary Śląskie', '41-001'),
(88, 'Police', '72-001'),
(89, 'Pruszków', '05-001'),
(90, 'Racibórz', '47-001'),
(91, 'Sandomierz', '27-001'),
(92, 'Sępólno Krajeńskie', '89-001'),
(93, 'Skarżysko-Kamienna', '26-001'),
(94, 'Starachowice', '26-001'),
(95, 'Stalowa Wola', '37-001'),
(96, 'Świdnica', '58-001'),
(97, 'Świnoujście', '72-001'),
(98, 'Szczecinek', '78-001'),
(99, 'Tarnowskie Góry', '42-001'),
(100, 'Turek', '99-001'),
(101, 'Ustka', '76-001'),
(102, 'Wejherowo', '84-001'),
(103, 'TrudnoOkreslic', '98-001'),
(104, 'Wschowa', '67-001'),
(105, 'Zgorzelec', '59-001'),
(106, 'Żyrardów', '96-001'),
(107, 'Solec Kujawski', '86-050'),
(108, 'Żnin', '86-150');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `paragony`
--

CREATE TABLE `paragony` (
  `id_paragonu` int(11) NOT NULL,
  `id_uzytkownika` int(11) NOT NULL,
  `id_firmy` int(11) NOT NULL,
  `id_miasta` int(11) NOT NULL,
  `ulica` varchar(25) NOT NULL,
  `suma` decimal(10,2) NOT NULL,
  `sumaZOperacji` decimal(10,2) DEFAULT NULL,
  `rabat` decimal(10,2) NOT NULL,
  `opis` text DEFAULT NULL,
  `obraz` longblob DEFAULT NULL,
  `data_dodania` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `paragony`
--


-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `powiadomienia`
--

CREATE TABLE `powiadomienia` (
  `id_powiadomienia` int(11) NOT NULL,
  `id_limitu` int(11) NOT NULL,
  `tresc` text DEFAULT NULL,
  `data_utworzenia` timestamp NOT NULL DEFAULT current_timestamp(),
  `id_uzytkownika` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `powiadomienia`
--



-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `produkty`
--

CREATE TABLE `produkty` (
  `id_produktu` int(11) NOT NULL,
  `id_paragonu` int(11) NOT NULL,
  `nazwa` varchar(30) NOT NULL,
  `cena` decimal(10,2) NOT NULL,
  `cenajednostkowa` decimal(10,2) DEFAULT NULL,
  `ilosc` double NOT NULL,
  `jednostka` varchar(15) NOT NULL,
  `opis` text DEFAULT NULL,
  `typ_podatku` char(1) NOT NULL,
  `id_kategorii` int(11) NOT NULL,
  `id_kodu` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `produkty`
--


-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `kody_ean`
--

CREATE TABLE `kody_ean` (
  `id_kodu` int(11) NOT NULL,
  `kod_ean` varchar(50) DEFAULT NULL,
  `nazwa_produktu` varchar(255) DEFAULT NULL,
  `marka` varchar(255) DEFAULT NULL,
  `image_url` text DEFAULT NULL,
  `kalorie` decimal(10,2) DEFAULT NULL,
  `tluszcz` decimal(10,2) DEFAULT NULL,
  `cukry` decimal(10,2) DEFAULT NULL,
  `bialko` decimal(10,2) DEFAULT NULL,
  `sol` decimal(10,2) DEFAULT NULL,
  `blonnik` decimal(10,2) DEFAULT NULL,
  `weglowodany` decimal(10,2) DEFAULT NULL,
  `sod` decimal(10,2) DEFAULT NULL,
  `wartosc_odzywcza` int(11) DEFAULT NULL,
  `allergens` text DEFAULT NULL,
  `ingredients_text` text DEFAULT NULL,
  `data_dodania` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `kody_ean`
--

INSERT INTO `kody_ean` (`id_kodu`, `kod_ean`, `nazwa_produktu`, `marka`, `image_url`, `kalorie`, `tluszcz`, `cukry`, `bialko`, `sol`, `blonnik`, `weglowodany`, `sod`, `wartosc_odzywcza`, `allergens`, `ingredients_text`) VALUES
(1, NULL, 'Nieznane', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `uzytkownicy`
--

CREATE TABLE `uzytkownicy` (
  `id_uzytkownika` int(11) NOT NULL,
  `email` varchar(50) NOT NULL,
  `password` varchar(80) NOT NULL,
  `imie` varchar(50) NOT NULL,
  `apiKlucz` varchar(100) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'default',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `premium_since` timestamp NULL DEFAULT NULL,
  `google_id` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `uzytkownicy`
--


-- --------------------------------------------------------

--
-- Indeksy dla zrzutów tabel
--

--
-- Indeksy dla tabeli `firmy`
--
ALTER TABLE `firmy`
  ADD PRIMARY KEY (`id_firmy`),
  ADD UNIQUE KEY `id_firmy` (`id_firmy`),
  ADD UNIQUE KEY `nazwa` (`nazwa`);

--
-- Indeksy dla tabeli `kategorie`
--
ALTER TABLE `kategorie`
  ADD PRIMARY KEY (`id_kategorii`),
  ADD UNIQUE KEY `id_kategorii` (`id_kategorii`);

--
-- Indeksy dla tabeli `kody_ean`
--
ALTER TABLE `kody_ean`
  ADD PRIMARY KEY (`id_kodu`),
  ADD UNIQUE KEY `kod_ean` (`kod_ean`);

--
-- Indeksy dla tabeli `limity`
--
ALTER TABLE `limity`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_kategorii` (`id_kategorii`),
  ADD KEY `id_uzytkownika` (`id_uzytkownika`);

--
-- Indeksy dla tabeli `lista`
--
ALTER TABLE `lista`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id` (`id`),
  ADD KEY `fk_id_uzytkownika1` (`id_uzytkownika`);

--
-- Indeksy dla tabeli `listy`
--
ALTER TABLE `listy`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_id_listy` (`id_listy`),
  ADD KEY `fk_id_produktu` (`id_produktu`),
  ADD KEY `fk_id_uzytkownika` (`id_uzytkownika`);

--
-- Indeksy dla tabeli `miasta`
--
ALTER TABLE `miasta`
  ADD PRIMARY KEY (`id_miasta`);

--
-- Indeksy dla tabeli `paragony`
--
ALTER TABLE `paragony`
  ADD PRIMARY KEY (`id_paragonu`),
  ADD KEY `Paragony_fk1` (`id_uzytkownika`),
  ADD KEY `Paragony_fk2` (`id_firmy`),
  ADD KEY `Paragony_fk3` (`id_miasta`);

--
-- Indeksy dla tabeli `powiadomienia`
--
ALTER TABLE `powiadomienia`
  ADD PRIMARY KEY (`id_powiadomienia`),
  ADD UNIQUE KEY `powiadomienie` (`tresc`,`id_uzytkownika`,`id_limitu`) USING HASH,
  ADD KEY `id_uzytkownika` (`id_uzytkownika`),
  ADD KEY `id_limitu` (`id_limitu`);

--
-- Indeksy dla tabeli `produkty`
--
ALTER TABLE `produkty`
  ADD PRIMARY KEY (`id_produktu`),
  ADD KEY `Produkty_fk1` (`id_paragonu`),
  ADD KEY `Produkty_fk8` (`id_kategorii`),
  ADD KEY `Produkty_fk9` (`id_kodu`);

--
-- Indeksy dla tabeli `uzytkownicy`
--
ALTER TABLE `uzytkownicy`
  ADD PRIMARY KEY (`id_uzytkownika`),
  ADD UNIQUE KEY `id_uzytkownika` (`id_uzytkownika`),
  ADD UNIQUE KEY `login` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `firmy`
--
ALTER TABLE `firmy`
  MODIFY `id_firmy` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT for table `kategorie`
--
ALTER TABLE `kategorie`
  MODIFY `id_kategorii` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

--
-- AUTO_INCREMENT for table `kody_ean`
--
ALTER TABLE `kody_ean`
  MODIFY `id_kodu` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `limity`
--
ALTER TABLE `limity`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `lista`
--
ALTER TABLE `lista`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `listy`
--
ALTER TABLE `listy`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `miasta`
--
ALTER TABLE `miasta`
  MODIFY `id_miasta` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=109;

--
-- AUTO_INCREMENT for table `paragony`
--
ALTER TABLE `paragony`
  MODIFY `id_paragonu` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `powiadomienia`
--
ALTER TABLE `powiadomienia`
  MODIFY `id_powiadomienia` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `produkty`
--
ALTER TABLE `produkty`
  MODIFY `id_produktu` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `uzytkownicy`
--
ALTER TABLE `uzytkownicy`
  MODIFY `id_uzytkownika` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `limity`
--
ALTER TABLE `limity`
  ADD CONSTRAINT `limity_ibfk_1` FOREIGN KEY (`id_kategorii`) REFERENCES `kategorie` (`id_kategorii`),
  ADD CONSTRAINT `limity_ibfk_2` FOREIGN KEY (`id_uzytkownika`) REFERENCES `uzytkownicy` (`id_uzytkownika`);

--
-- Constraints for table `lista`
--
ALTER TABLE `lista`
  ADD CONSTRAINT `fk_id_uzytkownika1` FOREIGN KEY (`id_uzytkownika`) REFERENCES `uzytkownicy` (`id_uzytkownika`);

--
-- Constraints for table `listy`
--
ALTER TABLE `listy`
  ADD CONSTRAINT `fk_id_listy` FOREIGN KEY (`id_listy`) REFERENCES `lista` (`id`),
  ADD CONSTRAINT `fk_id_produktu` FOREIGN KEY (`id_produktu`) REFERENCES `produkty` (`id_produktu`),
  ADD CONSTRAINT `fk_id_uzytkownika` FOREIGN KEY (`id_uzytkownika`) REFERENCES `uzytkownicy` (`id_uzytkownika`);

--
-- Constraints for table `paragony`
--
ALTER TABLE `paragony`
  ADD CONSTRAINT `Paragony_fk1` FOREIGN KEY (`id_uzytkownika`) REFERENCES `uzytkownicy` (`id_uzytkownika`),
  ADD CONSTRAINT `Paragony_fk2` FOREIGN KEY (`id_firmy`) REFERENCES `firmy` (`id_firmy`),
  ADD CONSTRAINT `Paragony_fk3` FOREIGN KEY (`id_miasta`) REFERENCES `miasta` (`id_miasta`);

--
-- Constraints for table `powiadomienia`
--
ALTER TABLE `powiadomienia`
  ADD CONSTRAINT `powiadomienia1_ibfk_1` FOREIGN KEY (`id_uzytkownika`) REFERENCES `uzytkownicy` (`id_uzytkownika`),
  ADD CONSTRAINT `powiadomienia1_ibfk_2` FOREIGN KEY (`id_limitu`) REFERENCES `limity` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `produkty`
--
ALTER TABLE `produkty`
  ADD CONSTRAINT `Produkty_fk1` FOREIGN KEY (`id_paragonu`) REFERENCES `paragony` (`id_paragonu`),
  ADD CONSTRAINT `Produkty_fk8` FOREIGN KEY (`id_kategorii`) REFERENCES `kategorie` (`id_kategorii`),
  ADD CONSTRAINT `Produkty_fk9` FOREIGN KEY (`id_kodu`) REFERENCES `kody_ean` (`id_kodu`);

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `logi`
--

CREATE TABLE `logi` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_uzytkownika` int(11) DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `action` varchar(100) NOT NULL,
  `user_status_at_log` varchar(20) DEFAULT NULL,
  `details` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_logi_uzytkownik` (`id_uzytkownika`),
  CONSTRAINT `logi_ibfk_1` FOREIGN KEY (`id_uzytkownika`) REFERENCES `uzytkownicy` (`id_uzytkownika`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `logi`
--


COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
