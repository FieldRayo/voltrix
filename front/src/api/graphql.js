// src/api/graphql.js
// Helper sencillo para mandar queries/mutations al backend GraphQL con fetch.

const ENDPOINT = 'http://localhost:4000/graphql'

export async function graphqlRequest(query, variables = {}) {
  let res
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    })
  } catch (err) {
    console.error(err)
    const sinRed = new Error('No pudimos conectar con la tienda. Revisa tu conexión e inténtalo de nuevo.')
    sinRed.codigo = 'SIN_CONEXION'
    throw sinRed
  }

  const json = await res.json()

  if (json.errors) {
    console.error(json.errors)
    const error = new Error(json.errors[0]?.message || 'No pudimos completar la operación.')
    // El código lo pone el servidor en los errores de negocio (stock, carrito
    // vacío). Sin código es una falla técnica y su mensaje no se le enseña
    // al cliente.
    error.codigo = json.errors[0]?.extensions?.code
    throw error
  }

  return json.data
}

// --- Queries ---

export function obtenerCategorias() {
  return graphqlRequest(`
    query {
      categorias {
        id
        nombre
      }
    }
  `).then((data) => data.categorias)
}

export function obtenerProductosPorCategoria(categoriaId) {
  return graphqlRequest(`
    query {
      categoria(id: "${categoriaId}") {
        id
        nombre
        productos {
          id
          nombre
          precio
          imagen
          stock
        }
      }
    }
  `).then((data) => data.categoria)
}

export function obtenerProducto(id) {
  return graphqlRequest(`
    query {
      producto(id: "${id}") {
        id
        nombre
        precio
        imagen
        especificaciones
        stock
        categoria {
          id
          nombre
        }
      }
    }
  `).then((data) => data.producto)
}

export function obtenerTodosLosProductos() {
  return graphqlRequest(`
    query {
      productos {
        id
        nombre
        precio
        imagen
        especificaciones
        stock
        categoria {
          id
          nombre
        }
      }
    }
  `).then((data) => data.productos)
}

// --- Mutation: registrar pedido (checkout) ---

export function crearPedido(usuarioId, items) {
  const itemsGql = items
    .map((it) => `{ productoId: "${it.productoId}", cantidad: ${it.cantidad} }`)
    .join(', ')

  return graphqlRequest(`
    mutation {
      crearPedido(datos: { usuarioId: "${usuarioId}", items: [${itemsGql}] }) {
        id
        total
        status
        fecha
      }
    }
  `).then((data) => data.crearPedido)
}
