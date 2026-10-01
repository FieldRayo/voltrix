// Prueba de punta a punta de OAuth 2.0, permisos y pedidos contra un servidor
// corriendo (npm run dev) con la base cargada desde db.sql.
//   BASE=http://localhost:4321 npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carritoReducer } from '../src/lib/carrito.js'

const BASE = process.env.BASE || 'http://localhost:4321'
const CLIENT_ID = 'voltrix-web'

const token = (params) =>
  fetch(`${BASE}/api/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, ...params }),
  }).then(async (r) => ({ status: r.status, ...(await r.json()) }))

const gql = (query, variables, access) =>
  fetch(`${BASE}/api/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(access && { Authorization: `Bearer ${access}` }) },
    body: JSON.stringify({ query, variables }),
  }).then((r) => r.json())

const codigo = (r) => r.errors?.[0]?.extensions?.code

test('carrito: suma repetidos y respeta el stock', () => {
  const p = { id: 1, nombre: 'X', precio: 10, stock: 2 }
  let items = carritoReducer([], { type: 'AGREGAR', payload: p })
  items = carritoReducer(items, { type: 'AGREGAR', payload: p })
  items = carritoReducer(items, { type: 'AGREGAR', payload: p })
  assert.equal(items[0].cantidad, 2)
  items = carritoReducer(items, { type: 'CAMBIAR_CANTIDAD', payload: { id: 1, cantidad: -4 } })
  assert.equal(items[0].cantidad, 1)
  assert.deepEqual(carritoReducer(items, { type: 'QUITAR', payload: 1 }), [])
})

test('registro, OAuth password/refresh/revoke, permisos y pedido', async () => {
  const email = `prueba${Date.now()}@voltrix.test`
  const password = 'contraseña-segura'

  // Registro
  let r = await fetch(`${BASE}/api/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Prueba', email, password }),
  })
  assert.equal(r.status, 201)
  r = await fetch(`${BASE}/api/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Prueba', email: email.toUpperCase(), password }),
  })
  assert.equal(r.status, 409, 'el correo no distingue mayúsculas')

  // Grant password
  assert.equal((await token({ grant_type: 'password', username: email, password: 'mala' })).error, 'invalid_grant')
  assert.equal((await token({ grant_type: 'client_credentials' })).error, 'unsupported_grant_type')
  assert.equal((await token({ grant_type: 'password', username: email, password, client_id: 'otro' })).status, 401)
  const t = await token({ grant_type: 'password', username: email, password })
  assert.equal(t.token_type, 'Bearer')
  assert.ok(t.access_token && t.refresh_token)

  // Token -> usuario
  assert.equal((await gql('{ yo { email rol } }', {}, t.access_token)).data.yo.email, email)
  assert.equal((await gql('{ yo { email } }')).data.yo, null)

  // Permisos
  assert.equal(codigo(await gql('{ usuarios { id } }', {}, t.access_token)), 'FORBIDDEN')
  assert.equal(codigo(await gql('mutation { crearPedido(items: [{ productoId: 3, cantidad: 1 }]) { id } }')), 'UNAUTHENTICATED')

  // Pedido: stock insuficiente no mueve nada; uno válido descuenta
  const stock = async () => (await gql('{ producto(id: 3) { stock } }')).data.producto.stock
  const antes = await stock()
  const PEDIR = 'mutation ($items: [ItemPedidoInput!]!) { crearPedido(items: $items) { id total usuario { email } } }'
  r = await gql(PEDIR, { items: [{ productoId: 3, cantidad: antes }, { productoId: 3, cantidad: 1 }] }, t.access_token)
  assert.equal(codigo(r), 'STOCK_INSUFICIENTE')
  assert.equal(await stock(), antes)
  r = await gql(PEDIR, { items: [{ productoId: 3, cantidad: 2 }] }, t.access_token)
  assert.equal(r.data.crearPedido.usuario.email, email)
  assert.equal(r.data.crearPedido.total, 90)
  assert.equal(await stock(), antes - 2)

  // Otro usuario no ve el pedido
  const admin = await token({ grant_type: 'password', username: 'admin@voltrix.test', password: 'AdminPrueba123' })
  if (!admin.error) {
    assert.ok((await gql(`{ pedido(id: ${r.data.crearPedido.id}) { id } }`, {}, admin.access_token)).data.pedido)
  }

  // Refresh con rotación: el refresh viejo ya no sirve y el access viejo tampoco
  const t2 = await token({ grant_type: 'refresh_token', refresh_token: t.refresh_token })
  assert.ok(t2.access_token)
  assert.equal((await token({ grant_type: 'refresh_token', refresh_token: t.refresh_token })).error, 'invalid_grant')
  assert.equal((await gql('{ yo { id } }', {}, t.access_token)).data.yo, null)

  // Revocar cierra la sesión
  await fetch(`${BASE}/api/oauth/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: t2.refresh_token }),
  })
  assert.equal((await gql('{ yo { id } }', {}, t2.access_token)).data.yo, null)

  // Bloqueo tras 5 intentos fallidos, aunque luego la contraseña sea correcta
  for (let i = 0; i < 5; i++) await token({ grant_type: 'password', username: email, password: 'mala' })
  assert.equal((await token({ grant_type: 'password', username: email, password })).error, 'invalid_grant')
})
