// Prueba de la validación de stock de crearPedido.
// El backend tiene que estar corriendo: node index.js
//
//   node prueba-stock.mjs
import assert from 'node:assert/strict'

const ENDPOINT = 'http://localhost:4000/'

async function gql(query) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  return res.json()
}

const stockDe = async (id) =>
  (await gql(`{ producto(id: "${id}") { stock } }`)).data.producto.stock

const pedir = (renglones) =>
  gql(`mutation { crearPedido(datos: { usuarioId: "2", items: [${renglones}] }) { id total } }`)

const antes = await stockDe(1)

// 1. Pedir más de lo que hay se rechaza y no mueve el stock.
let r = await pedir(`{ productoId: "1", cantidad: ${antes + 1} }`)
assert.equal(r.errors[0].extensions.code, 'STOCK_INSUFICIENTE')
assert.match(r.errors[0].message, /Solo quedan/)
assert.equal(await stockDe(1), antes, 'el stock no se debe mover si el pedido falla')

// 2. El mismo producto repetido suma cantidades antes de comparar.
const mitad = Math.ceil(antes / 2) + 1
r = await pedir(`{ productoId: "1", cantidad: ${mitad} }, { productoId: "1", cantidad: ${mitad} }`)
assert.equal(r.errors[0].extensions.code, 'STOCK_INSUFICIENTE')
assert.equal(await stockDe(1), antes)

// 3. Cantidad cero o negativa se rechaza.
r = await pedir(`{ productoId: "1", cantidad: 0 }`)
assert.equal(r.errors[0].extensions.code, 'CANTIDAD_INVALIDA')

// 4. Un pedido válido sí descuenta.
r = await pedir(`{ productoId: "1", cantidad: 2 }`)
assert.ok(r.data.crearPedido.id, 'el pedido válido debe registrarse')
assert.equal(await stockDe(1), antes - 2)

console.log('Todo bien. El stock pasó de', antes, 'a', await stockDe(1))
