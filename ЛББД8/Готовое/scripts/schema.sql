PRAGMA foreign_keys = ON;

CREATE TABLE тип_контрагента (
    код_типа_контрагента INTEGER PRIMARY KEY,
    название_типа            TEXT NOT NULL UNIQUE
);
CREATE TABLE контрагент (
    код_контрагента      INTEGER PRIMARY KEY,
    наименование    TEXT NOT NULL,
    инн                  TEXT UNIQUE CHECK (инн IS NULL OR (length(инн) BETWEEN 10 AND 12 AND инн NOT GLOB '*[^0-9]*')),
    адрес              TEXT,
    телефон                TEXT,
    код_типа_контрагента INTEGER NOT NULL REFERENCES тип_контрагента (код_типа_контрагента) ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE TABLE единица_измерения (
    код_единицы   INTEGER PRIMARY KEY,
    название_единицы TEXT NOT NULL UNIQUE
);
CREATE TABLE вид_номенклатуры (
    код_вида INTEGER PRIMARY KEY,
    название_типа    TEXT NOT NULL UNIQUE
);
CREATE TABLE номенклатура (
    код_номенклатуры      INTEGER PRIMARY KEY,
    артикул    TEXT UNIQUE,
    название    TEXT NOT NULL UNIQUE,
    код_вида INTEGER NOT NULL REFERENCES вид_номенклатуры (код_вида) ON UPDATE CASCADE ON DELETE RESTRICT,
    код_единицы      INTEGER NOT NULL REFERENCES единица_измерения (код_единицы) ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE TABLE цена (
    код_номенклатуры     INTEGER PRIMARY KEY REFERENCES номенклатура (код_номенклатуры) ON UPDATE CASCADE ON DELETE CASCADE,
    значение_цены NUMERIC NOT NULL CHECK (значение_цены >= 0)
);
CREATE TABLE спецификация (
    код_спецификации INTEGER PRIMARY KEY,
    код_продукции       INTEGER NOT NULL UNIQUE REFERENCES номенклатура (код_номенклатуры) ON UPDATE CASCADE ON DELETE RESTRICT,
    код_изготовителя  INTEGER NOT NULL REFERENCES контрагент (код_контрагента) ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE TABLE спецификация_материал (
    код_спецификации INTEGER NOT NULL REFERENCES спецификация (код_спецификации) ON UPDATE CASCADE ON DELETE CASCADE,
    код_материала      INTEGER NOT NULL REFERENCES номенклатура (код_номенклатуры) ON UPDATE CASCADE ON DELETE RESTRICT,
    количество         REAL NOT NULL CHECK (количество > 0),
    PRIMARY KEY (код_спецификации, код_материала)
);
CREATE TABLE спецификация_операция (
    код_спецификации INTEGER NOT NULL REFERENCES спецификация (код_спецификации) ON UPDATE CASCADE ON DELETE CASCADE,
    код_операции     INTEGER NOT NULL REFERENCES номенклатура (код_номенклатуры) ON UPDATE CASCADE ON DELETE RESTRICT,
    норма_времени        REAL NOT NULL CHECK (норма_времени > 0),
    количество         REAL NOT NULL CHECK (количество > 0),
    PRIMARY KEY (код_спецификации, код_операции)
);
CREATE TABLE подразделение (
    код_подразделения   INTEGER PRIMARY KEY,
    название_подразделения TEXT NOT NULL UNIQUE
);
CREATE TABLE заказ_на_производство (
    код_заказа_на_производство INTEGER PRIMARY KEY,
    номер        INTEGER NOT NULL,
    дата_запуска         TEXT NOT NULL,
    код_подразделения       INTEGER NOT NULL REFERENCES подразделение (код_подразделения) ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE (номер, дата_запуска)
);
CREATE TABLE строка_заказа_на_производство (
    код_заказа_на_производство INTEGER NOT NULL REFERENCES заказ_на_производство (код_заказа_на_производство) ON UPDATE CASCADE ON DELETE CASCADE,
    номер_строки             INTEGER NOT NULL CHECK (номер_строки > 0),
    код_продукции          INTEGER NOT NULL REFERENCES номенклатура (код_номенклатуры) ON UPDATE CASCADE ON DELETE RESTRICT,
    количество            REAL NOT NULL CHECK (количество > 0),
    PRIMARY KEY (код_заказа_на_производство, номер_строки)
);
CREATE TABLE заказ_покупателя (
    код_заказа_покупателя INTEGER PRIMARY KEY,
    номер      INTEGER NOT NULL,
    дата_заказа        TEXT NOT NULL,
    код_исполнителя       INTEGER NOT NULL REFERENCES контрагент (код_контрагента) ON UPDATE CASCADE ON DELETE RESTRICT,
    код_заказчика       INTEGER NOT NULL REFERENCES контрагент (код_контрагента) ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE (номер, дата_заказа)
);
CREATE TABLE строка_заказа_покупателя (
    код_заказа_покупателя INTEGER NOT NULL REFERENCES заказ_покупателя (код_заказа_покупателя) ON UPDATE CASCADE ON DELETE CASCADE,
    номер_строки           INTEGER NOT NULL CHECK (номер_строки > 0),
    код_продукции        INTEGER NOT NULL REFERENCES номенклатура (код_номенклатуры) ON UPDATE CASCADE ON DELETE RESTRICT,
    количество          REAL NOT NULL CHECK (количество > 0),
    цена_продажи             NUMERIC NOT NULL CHECK (цена_продажи >= 0),
    скидка   NUMERIC NOT NULL DEFAULT 0 CHECK (скидка >= 0),
    PRIMARY KEY (код_заказа_покупателя, номер_строки)
);

INSERT INTO тип_контрагента VALUES (1,'Поставщик'),(2,'Покупатель'),(3,'Организация');
INSERT INTO вид_номенклатуры VALUES (1,'Продукция'),(2,'Материал'),(3,'Технологическая операция');
INSERT INTO единица_измерения VALUES (1,'шт'),(2,'тыс. шт'),(3,'ч');
INSERT INTO подразделение VALUES (1,'Основное подразделение');
