-- Voltrix. Base de datos del e-commerce (PostgreSQL).
-- Esquema de la P6 con el catálogo de componentes electrónicos de la P2.
--
--   psql -h 127.0.0.1 -U voltrix -d voltrix -f db.sql

DROP TABLE IF EXISTS detalle_pedido, pedido, producto, usuario, categoria;
DROP TYPE  IF EXISTS rol_usuario, status_pedido;

-- Postgres tiene ENUM de verdad (CREATE TYPE), no como el enum de columna de
-- MySQL. Cada uno corresponde 1 a 1 con un enum del schema GraphQL.
CREATE TYPE rol_usuario   AS ENUM ('CLIENTE', 'ADMIN');
CREATE TYPE status_pedido AS ENUM ('PENDIENTE', 'PAGADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO');

CREATE TABLE categoria (
  id          serial PRIMARY KEY,
  nombre      varchar(100) NOT NULL,
  descripcion varchar(255)
);

CREATE TABLE producto (
  id               serial PRIMARY KEY,
  nombre           varchar(150) NOT NULL,
  precio           numeric(10,2) NOT NULL CHECK (precio >= 0),
  imagen           varchar(255),
  especificaciones varchar(255),
  stock            integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  categoria_id     integer REFERENCES categoria (id)
);
CREATE INDEX producto_categoria_id_idx ON producto (categoria_id);

CREATE TABLE usuario (
  id       serial PRIMARY KEY,
  nombre   varchar(150) NOT NULL,
  email    varchar(150) NOT NULL UNIQUE,
  password varchar(255) NOT NULL,
  rol      rol_usuario NOT NULL DEFAULT 'CLIENTE'
);

CREATE TABLE pedido (
  id         serial PRIMARY KEY,
  fecha      date NOT NULL,
  total      numeric(10,2) NOT NULL,
  status     status_pedido NOT NULL DEFAULT 'PENDIENTE',
  usuario_id integer REFERENCES usuario (id)
);
CREATE INDEX pedido_usuario_id_idx ON pedido (usuario_id);

CREATE TABLE detalle_pedido (
  id          serial PRIMARY KEY,
  pedido_id   integer NOT NULL REFERENCES pedido (id),
  producto_id integer NOT NULL REFERENCES producto (id),
  cantidad    integer NOT NULL CHECK (cantidad > 0),
  subtotal    numeric(10,2) NOT NULL
);
CREATE INDEX detalle_pedido_pedido_id_idx   ON detalle_pedido (pedido_id);
CREATE INDEX detalle_pedido_producto_id_idx ON detalle_pedido (producto_id);

INSERT INTO categoria (id, nombre, descripcion) VALUES
(1, 'Microcontroladores', 'Placas ESP32, Arduino, STM32'),
(2, 'Sensores', 'Sensores de temperatura, humedad, gas'),
(3, 'Displays', 'Pantallas OLED, LCD I2C');

INSERT INTO producto (id, nombre, precio, imagen, especificaciones, stock, categoria_id) VALUES
(1, 'ESP32 WROOM 32D', 145.00, '/productos/esp32.svg', 'Dual core, WiFi/BT, 3.3V', 50, 1),
(2, 'Arduino Mega 2560', 480.00, '/productos/arduino-mega.svg', 'ATmega2560, 54 I/O digital', 20, 1),
(3, 'Sensor DHT11', 45.00, '/productos/dht11.svg', 'Humedad 20-90%, Temp 0-50°C', 100, 2),
(4, 'Pantalla LCD 16x2 I2C', 95.00, '/productos/lcd-1602.svg', 'Fondo azul, dirección 0x27', 35, 3),
(5, 'Display OLED 0.96 I2C', 110.00, '/productos/oled-096.svg', '128x64 pixeles, 3.3V-5V', 40, 3);

INSERT INTO usuario (id, nombre, email, password, rol) VALUES
(1, 'Fernando Rodríguez', 'fernando@voltrix.com', '1234', 'ADMIN'),
(2, 'Cliente Demo', 'cliente@voltrix.com', 'abcd', 'CLIENTE');

-- Los INSERT de arriba traen el id a mano, así que la secuencia de cada serial
-- sigue en 1 y el próximo INSERT sin id chocaría con la PK. setval la adelanta
-- hasta el último id usado.
SELECT setval('categoria_id_seq', (SELECT max(id) FROM categoria));
SELECT setval('producto_id_seq',  (SELECT max(id) FROM producto));
SELECT setval('usuario_id_seq',   (SELECT max(id) FROM usuario));
