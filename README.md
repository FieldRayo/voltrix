# Voltrix

Tienda en línea de componentes electrónicos: catálogo, carrito, cuentas de
cliente con OAuth 2.0 y pedidos con control de stock.

- **Astro 7** con render en servidor (adapter de Netlify) e islas de React para
  lo interactivo (carrito, sesión, checkout, cuenta).
- **PostgreSQL** para catálogo, usuarios, pedidos y tokens.
- **API GraphQL** en `/api/graphql` (graphql-yoga).
- **OAuth 2.0** en `/api/oauth/token` y `/api/oauth/revoke`.

```
db.sql                 esquema y catálogo inicial
src/lib/               db, auth (scrypt + tokens), GraphQL, carrito y sesión del cliente
src/pages/             páginas (.astro) y endpoints (api/)
src/components/        islas de React
scripts/crear-admin.mjs
test/api.test.js       prueba de punta a punta
```

## Desarrollo local

Requiere Node 22+ y PostgreSQL 13+.

```bash
cp .env.example .env              # ajusta DATABASE_URL
psql "$DATABASE_URL" -f db.sql    # ojo: empieza con DROP
npm install
npm run crear-admin -- admin@tudominio.com "Nombre" 'una-contraseña-larga'
npm run dev                       # http://localhost:4321
npm test                          # con el dev server corriendo
```

## Autenticación (OAuth 2.0)

Cliente público `voltrix-web` (configurable con `OAUTH_CLIENT_ID`).

| Grant | Petición (`application/x-www-form-urlencoded`) |
|--|--|
| Contraseña (RFC 6749 §4.3) | `grant_type=password&username=<correo>&password=<…>&client_id=voltrix-web` |
| Renovar (§6) | `grant_type=refresh_token&refresh_token=<…>&client_id=voltrix-web` |
| Cerrar sesión (RFC 7009) | `POST /api/oauth/revoke` con `token=<…>` |

- Access token de 1 hora y refresh de 30 días. Son opacos y en la base solo se
  guarda su sha256.
- Cada refresh se usa una sola vez (rotación). Revocar cualquiera de los dos
  tokens cierra la sesión entera.
- Las contraseñas se guardan con scrypt. Tras 5 intentos fallidos la cuenta se
  bloquea 15 minutos.
- La API GraphQL recibe el token como `Authorization: Bearer <access_token>`.
  `crearPedido` siempre registra el pedido a nombre del dueño del token.
  Usuarios, todos los pedidos y el CRUD de productos son solo para `ADMIN`.

Los clientes se registran en `/registro` y los administradores se crean con
`npm run crear-admin`.

## Despliegue en Netlify

```bash
npx netlify login
npx netlify init            # crea o enlaza el sitio
npx netlify db init         # Netlify DB (Postgres en Neon); define NETLIFY_DATABASE_URL
psql "<url de la base>" -f db.sql
DATABASE_URL="<url de la base>" npm run crear-admin -- admin@tudominio.com "Nombre" '…'
npx netlify deploy --build --prod
```

Si se usa otra base PostgreSQL, basta con definir `DATABASE_URL` en las
variables de entorno del sitio.
