# Voltrix

Tienda de componentes electrónicos. Este repositorio une las tres prácticas de
Programación Web 2 en un solo proyecto:

| Práctica | Qué aportó |
|--|--|
| P1, componentes y efectos | La vista Equipo (`Equipo.jsx` y `ProfileCard.jsx`), con su carga simulada por `useEffect` y las tarjetas que guardan su propio estado. |
| P2, Voltrix y maquetado del flujo | La marca, la paleta, la máquina de estados, el carrito con Context y `useReducer`, el footer y los skeletons. De ahí salen también el catálogo de electrónica y el campo `especificaciones`. |
| P6, GraphQL con base de datos | El backend de Apollo Server sobre PostgreSQL y las consultas del front (`src/api/graphql.js`). |

Las prácticas se unieron tal como estaban. No se completó lo que quedaba
pendiente en cada una.

```
voltrix/
  db.sql        esquema y datos de ejemplo (PostgreSQL)
  back/         servidor GraphQL (Apollo Server + node-postgres)
  front/        cliente React (Vite)
```

## Paleta y estilo

La interfaz es de barro: cada bloque sale del fondo con una sombra clara
arriba y una oscura abajo, sin bordes ni líneas divisorias. Los hundidos
(la miniatura del producto, el input de cantidad) usan la misma sombra por
dentro. Todo vive en las variables del inicio de
`front/src/styles/global.css`.

| Uso | Color |
|--|--|
| Azul de marca | `#1d4ed8` |
| Azul al pasar el cursor | `#1638ad` |
| Azul suave para etiquetas | `#eef2ff` |
| Tinta del footer | `#1a1a2e` |
| Fondo | `#e9ebf1` |
| Superficie | `#f1f3f8` |
| Alerta | `#e63946` |
| Confirmación | `#7ee787` |

## 1. Base de datos

PostgreSQL. Una sola vez, para crear el rol y la base:

```bash
sudo -u postgres psql -c "CREATE ROLE voltrix LOGIN PASSWORD 'voltrix'"
sudo -u postgres createdb -O voltrix voltrix
```

Y para cargar el esquema con sus datos de ejemplo (se puede repetir, el
archivo empieza con DROP):

```bash
psql -h 127.0.0.1 -U voltrix -d voltrix -f db.sql
```

Crea categorías, productos y dos usuarios de ejemplo.

## 2. Backend

```bash
cd back
cp .env.example .env    # ajusta usuario y contraseña de tu PostgreSQL
npm install
npm start
```

Queda en http://localhost:4000 con un solo endpoint GraphQL.

## 3. Frontend

```bash
cd front
npm install
npm run dev
```

Queda en http://localhost:5173 y apunta al backend en el puerto 4000.

## Flujo

`home > categoria > producto > carrito > checkout`, más la vista `equipo`.
Todo se controla con el estado `vista` en `App.jsx`, sin router ni URLs.
El checkout dispara la mutación `crearPedido`, que registra el pedido, guarda
sus detalles y descuenta stock dentro de una transacción.
