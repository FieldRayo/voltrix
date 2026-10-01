-- Voltrix. Esquema y catálogo inicial (PostgreSQL 13+).
--
--   psql "$DATABASE_URL" -f db.sql
--
-- Empieza con DROP, así que se puede repetir. Ojo: borra pedidos y usuarios.
-- No trae usuarios: los clientes se registran en /registro y el admin se crea
-- con `npm run crear-admin`.

DROP TABLE IF EXISTS oauth_token, detalle_pedido, pedido, producto, usuario, categoria;
DROP TYPE  IF EXISTS rol_usuario, status_pedido;

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
  id               serial PRIMARY KEY,
  nombre           varchar(150) NOT NULL,
  email            varchar(150) NOT NULL UNIQUE,  -- siempre en minúsculas
  password         varchar(255) NOT NULL,         -- hash scrypt (src/lib/auth.js)
  rol              rol_usuario NOT NULL DEFAULT 'CLIENTE',
  intentos_fallidos integer NOT NULL DEFAULT 0,
  bloqueado_hasta  timestamptz
);

CREATE TABLE pedido (
  id         serial PRIMARY KEY,
  fecha      date NOT NULL DEFAULT CURRENT_DATE,
  total      numeric(10,2) NOT NULL,
  status     status_pedido NOT NULL DEFAULT 'PENDIENTE',
  usuario_id integer NOT NULL REFERENCES usuario (id)
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

-- Tokens OAuth 2.0 (access y refresh). Solo se guarda el sha256 del token, así
-- que una copia de la base no sirve para hacerse pasar por nadie. Los tokens
-- emitidos juntos comparten "familia": revocar uno revoca la familia entera.
CREATE TABLE oauth_token (
  hash       char(64) PRIMARY KEY,
  tipo       varchar(7) NOT NULL CHECK (tipo IN ('access', 'refresh')),
  familia    uuid NOT NULL,
  usuario_id integer NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
  expira     timestamptz NOT NULL
);
CREATE INDEX oauth_token_familia_idx ON oauth_token (familia);

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

-- Los INSERT traen el id a mano; setval adelanta cada secuencia.
SELECT setval('categoria_id_seq', (SELECT max(id) FROM categoria));
SELECT setval('producto_id_seq',  (SELECT max(id) FROM producto));
