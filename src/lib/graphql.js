// API GraphQL (graphql-yoga sobre Fetch, corre igual en Netlify Functions).
// El usuario llega en el contexto a partir del access token OAuth.
import { createSchema, createYoga } from 'graphql-yoga'
import { GraphQLError } from 'graphql'
import { pool } from './db.js'
import { bearer, usuarioDeToken } from './auth.js'

const typeDefs = /* GraphQL */ `
  type Categoria {
    id: ID!
    nombre: String!
    descripcion: String
    productos: [Producto!]!
  }

  type Producto {
    id: ID!
    nombre: String!
    precio: Float!
    imagen: String
    especificaciones: String
    stock: Int!
    categoria: Categoria
  }

  enum Rol { CLIENTE ADMIN }

  type Usuario {
    id: ID!
    nombre: String!
    email: String!
    rol: Rol!
    pedidos: [Pedido!]!
  }

  enum StatusPedido { PENDIENTE PAGADO ENVIADO ENTREGADO CANCELADO }

  type DetallePedido {
    id: ID!
    producto: Producto!
    cantidad: Int!
    subtotal: Float!
  }

  type Pedido {
    id: ID!
    fecha: String!
    total: Float!
    status: StatusPedido!
    usuario: Usuario!
    detalles: [DetallePedido!]!
  }

  input ProductoInput {
    nombre: String!
    precio: Float!
    imagen: String
    especificaciones: String
    categoriaId: ID
    stock: Int!
  }

  input ItemPedidoInput {
    productoId: ID!
    cantidad: Int!
  }

  type Query {
    productos(limite: Int, desde: Int): [Producto!]!
    producto(id: ID!): Producto
    categorias: [Categoria!]!
    categoria(id: ID!): Categoria
    "Usuario dueño del token."
    yo: Usuario
    "Solo ADMIN."
    usuarios: [Usuario!]!
    "Solo ADMIN."
    pedidos: [Pedido!]!
    "Del usuario o ADMIN."
    pedido(id: ID!): Pedido
  }

  type Mutation {
    "Solo ADMIN."
    crearProducto(datos: ProductoInput!): Producto!
    "Solo ADMIN."
    actualizarProducto(id: ID!, datos: ProductoInput!): Producto
    "Solo ADMIN."
    eliminarProducto(id: ID!): Boolean!
    "El pedido queda a nombre del usuario del token."
    crearPedido(items: [ItemPedidoInput!]!): Pedido!
    "Solo ADMIN."
    cambiarStatusPedido(id: ID!, status: StatusPedido!): Pedido
  }
`

// Error de negocio: el código le dice al front que puede mostrar el mensaje.
const errorDeNegocio = (mensaje, code) => new GraphQLError(mensaje, { extensions: { code } })

function requiereUsuario(ctx) {
  if (!ctx.usuario) throw errorDeNegocio('Inicia sesión para continuar.', 'UNAUTHENTICATED')
  return ctx.usuario
}

function requiereAdmin(ctx) {
  if (requiereUsuario(ctx).rol !== 'ADMIN') throw errorDeNegocio('No tienes permiso.', 'FORBIDDEN')
}

const uno = async (sql, params) => (await pool.query(sql, params)).rows[0] || null
const varios = async (sql, params) => (await pool.query(sql, params)).rows

const resolvers = {
  Query: {
    productos: (_, { limite, desde }) =>
      limite
        ? varios('SELECT * FROM producto ORDER BY id LIMIT $1 OFFSET $2', [limite, desde || 0])
        : varios('SELECT * FROM producto ORDER BY id'),
    producto: (_, { id }) => uno('SELECT * FROM producto WHERE id = $1', [id]),
    categorias: () => varios('SELECT * FROM categoria ORDER BY id'),
    categoria: (_, { id }) => uno('SELECT * FROM categoria WHERE id = $1', [id]),
    yo: (_, __, ctx) => ctx.usuario,
    usuarios: (_, __, ctx) => {
      requiereAdmin(ctx)
      return varios('SELECT id, nombre, email, rol FROM usuario ORDER BY id')
    },
    pedidos: (_, __, ctx) => {
      requiereAdmin(ctx)
      return varios('SELECT * FROM pedido ORDER BY id DESC')
    },
    pedido: async (_, { id }, ctx) => {
      const usuario = requiereUsuario(ctx)
      const pedido = await uno('SELECT * FROM pedido WHERE id = $1', [id])
      // A quien no es dueño se le responde igual que si no existiera.
      if (!pedido || (pedido.usuario_id !== usuario.id && usuario.rol !== 'ADMIN')) return null
      return pedido
    },
  },

  Mutation: {
    crearProducto: (_, { datos }, ctx) => {
      requiereAdmin(ctx)
      const { nombre, precio, imagen, especificaciones, categoriaId, stock } = datos
      return uno(
        `INSERT INTO producto (nombre, precio, imagen, especificaciones, stock, categoria_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [nombre, precio, imagen || null, especificaciones || null, stock, categoriaId || null]
      )
    },

    actualizarProducto: (_, { id, datos }, ctx) => {
      requiereAdmin(ctx)
      const { nombre, precio, imagen, especificaciones, categoriaId, stock } = datos
      return uno(
        `UPDATE producto
            SET nombre = $1, precio = $2, imagen = $3, especificaciones = $4, stock = $5, categoria_id = $6
          WHERE id = $7 RETURNING *`,
        [nombre, precio, imagen || null, especificaciones || null, stock, categoriaId || null, id]
      )
    },

    eliminarProducto: async (_, { id }, ctx) => {
      requiereAdmin(ctx)
      try {
        const { rowCount } = await pool.query('DELETE FROM producto WHERE id = $1', [id])
        return rowCount > 0
      } catch (err) {
        if (err.code === '23503') {
          throw errorDeNegocio('El producto tiene pedidos; mejor deja su stock en 0.', 'PRODUCTO_CON_PEDIDOS')
        }
        throw err
      }
    },

    cambiarStatusPedido: (_, { id, status }, ctx) => {
      requiereAdmin(ctx)
      return uno('UPDATE pedido SET status = $1 WHERE id = $2 RETURNING *', [status, id])
    },

    // Registra el pedido, sus renglones y descuenta stock en una transacción.
    crearPedido: async (_, { items }, ctx) => {
      const usuario = requiereUsuario(ctx)
      if (!items.length) throw errorDeNegocio('Tu carrito está vacío.', 'CARRITO_VACIO')

      // Un producto repetido suma cantidades antes de validar contra el stock.
      const pedidas = new Map()
      for (const { productoId, cantidad } of items) {
        if (!Number.isInteger(cantidad) || cantidad < 1) {
          throw errorDeNegocio('La cantidad de cada producto tiene que ser un entero mayor que cero.', 'CANTIDAD_INVALIDA')
        }
        pedidas.set(productoId, (pedidas.get(productoId) || 0) + cantidad)
      }

      const conn = await pool.connect()
      try {
        await conn.query('BEGIN')
        let total = 0
        const detalles = []
        // Orden fijo de ids: dos pedidos simultáneos bloquean en el mismo orden
        // y no se traban entre sí.
        for (const [productoId, cantidad] of [...pedidas].sort((a, b) => a[0] - b[0])) {
          const { rows } = await conn.query('SELECT * FROM producto WHERE id = $1 FOR UPDATE', [productoId])
          const producto = rows[0]
          if (!producto) {
            throw errorDeNegocio('Uno de los productos de tu carrito ya no está disponible.', 'PRODUCTO_NO_EXISTE')
          }
          if (producto.stock < cantidad) {
            throw errorDeNegocio(
              producto.stock === 0
                ? `Nos quedamos sin "${producto.nombre}".`
                : `Solo quedan ${producto.stock} de "${producto.nombre}" y pediste ${cantidad}.`,
              'STOCK_INSUFICIENTE'
            )
          }
          const subtotal = Math.round(producto.precio * cantidad * 100) / 100
          total += subtotal
          detalles.push({ productoId, cantidad, subtotal })
        }

        const { rows } = await conn.query(
          'INSERT INTO pedido (total, usuario_id) VALUES ($1, $2) RETURNING *',
          [Math.round(total * 100) / 100, usuario.id]
        )
        const pedido = rows[0]
        for (const d of detalles) {
          await conn.query(
            'INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, subtotal) VALUES ($1, $2, $3, $4)',
            [pedido.id, d.productoId, d.cantidad, d.subtotal]
          )
          await conn.query('UPDATE producto SET stock = stock - $1 WHERE id = $2', [d.cantidad, d.productoId])
        }
        await conn.query('COMMIT')
        return pedido
      } catch (err) {
        await conn.query('ROLLBACK')
        throw err
      } finally {
        conn.release()
      }
    },
  },

  Producto: {
    categoria: (p) => p.categoria_id && uno('SELECT * FROM categoria WHERE id = $1', [p.categoria_id]),
  },
  Categoria: {
    productos: (c) => varios('SELECT * FROM producto WHERE categoria_id = $1 ORDER BY id', [c.id]),
  },
  Usuario: {
    pedidos: (u, _, ctx) => {
      requiereUsuario(ctx)
      if (ctx.usuario.id !== u.id && ctx.usuario.rol !== 'ADMIN') return []
      return varios('SELECT * FROM pedido WHERE usuario_id = $1 ORDER BY id DESC', [u.id])
    },
  },
  Pedido: {
    usuario: (p) => uno('SELECT id, nombre, email, rol FROM usuario WHERE id = $1', [p.usuario_id]),
    detalles: (p) => varios('SELECT * FROM detalle_pedido WHERE pedido_id = $1 ORDER BY id', [p.id]),
  },
  DetallePedido: {
    producto: (d) => uno('SELECT * FROM producto WHERE id = $1', [d.producto_id]),
  },
}

// ponytail: sin DataLoader; las relaciones hacen una consulta por renglón (N+1).
// Con catálogos de cientos de productos, agrupar con dataloader.
export const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: '/api/graphql',
  graphiql: import.meta.env.DEV,
  landingPage: false,
  context: async ({ request }) => ({ usuario: await usuarioDeToken(bearer(request)) }),
})
