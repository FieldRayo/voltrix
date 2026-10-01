// src/resolvers.js
import { GraphQLError } from 'graphql'
import { pool } from './db.js'

// Error de negocio: lleva un código para que el front sepa si el mensaje
// se le puede mostrar al cliente tal cual.
function errorDeNegocio(mensaje, code) {
  return new GraphQLError(mensaje, { extensions: { code } })
}

export const resolvers = {
  Query: {
    // Lista de productos, con paginación opcional (limite/desde)
    productos: async (_, { limite, desde }) => {
      let sql = 'SELECT * FROM producto ORDER BY id'
      const params = []
      if (limite) {
        // En Postgres el orden es LIMIT cuantos OFFSET desde (en MySQL era
        // LIMIT desde, cuantos). Van como parámetros, no interpolados.
        params.push(Number(limite), Number(desde) || 0)
        sql += ' LIMIT $1 OFFSET $2'
      }
      const { rows } = await pool.query(sql, params)
      return rows
    },

    producto: async (_, { id }) => {
      const { rows } = await pool.query('SELECT * FROM producto WHERE id = $1', [id])
      return rows[0] || null
    },

    categorias: async () => {
      const { rows } = await pool.query('SELECT * FROM categoria ORDER BY id')
      return rows
    },

    categoria: async (_, { id }) => {
      const { rows } = await pool.query('SELECT * FROM categoria WHERE id = $1', [id])
      return rows[0] || null
    },

    usuarios: async () => {
      const { rows } = await pool.query('SELECT * FROM usuario ORDER BY id')
      return rows
    },

    pedidos: async () => {
      const { rows } = await pool.query('SELECT * FROM pedido ORDER BY id DESC')
      return rows
    },

    pedido: async (_, { id }) => {
      const { rows } = await pool.query('SELECT * FROM pedido WHERE id = $1', [id])
      return rows[0] || null
    },
  },

  Mutation: {
    // --- CRUD de Producto ---
    crearProducto: async (_, { datos }) => {
      const { nombre, precio, imagen, especificaciones, categoriaId, stock } = datos
      // RETURNING * evita el segundo SELECT que hacía falta con MySQL
      // (allí solo venía el insertId).
      const { rows } = await pool.query(
        `INSERT INTO producto (nombre, precio, imagen, especificaciones, stock, categoria_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [nombre, precio, imagen || null, especificaciones || null, stock, categoriaId || null]
      )
      return rows[0]
    },

    actualizarProducto: async (_, { id, datos }) => {
      const { nombre, precio, imagen, especificaciones, categoriaId, stock } = datos
      const { rows } = await pool.query(
        `UPDATE producto
            SET nombre = $1, precio = $2, imagen = $3, especificaciones = $4,
                stock = $5, categoria_id = $6
          WHERE id = $7
      RETURNING *`,
        [nombre, precio, imagen || null, especificaciones || null, stock, categoriaId || null, id]
      )
      return rows[0] || null
    },

    eliminarProducto: async (_, { id }) => {
      const { rowCount } = await pool.query('DELETE FROM producto WHERE id = $1', [id])
      return rowCount > 0
    },

    // --- Mutation de negocio: registrar pedido (checkout) ---
    crearPedido: async (_, { datos }) => {
      const { usuarioId, items } = datos

      if (!items.length) {
        throw errorDeNegocio('Tu carrito está vacío.', 'CARRITO_VACIO')
      }

      // El mismo producto puede llegar repetido en la lista, así que sumamos
      // las cantidades antes de validar. Si no, cada renglón compararía contra
      // el stock completo y entre los dos se podrían llevar más de lo que hay.
      const pedidas = new Map()
      for (const item of items) {
        if (!Number.isInteger(item.cantidad) || item.cantidad < 1) {
          throw errorDeNegocio(
            'La cantidad de cada producto tiene que ser un número entero mayor que cero.',
            'CANTIDAD_INVALIDA'
          )
        }
        pedidas.set(item.productoId, (pedidas.get(item.productoId) || 0) + item.cantidad)
      }

      // Una transacción vive en UNA conexión, así que la sacamos del pool en
      // vez de usar pool.query (que puede darte una conexión distinta cada vez).
      const conn = await pool.connect()
      try {
        await conn.query('BEGIN')

        // FOR UPDATE bloquea cada renglón hasta el commit, así que entre la
        // revisión del stock y el descuento nadie más lo puede mover.
        let total = 0
        const detalles = []
        for (const [productoId, cantidad] of pedidas) {
          const { rows } = await conn.query('SELECT * FROM producto WHERE id = $1 FOR UPDATE', [productoId])
          const producto = rows[0]

          if (!producto) {
            throw errorDeNegocio('Uno de los productos de tu carrito ya no está disponible.', 'PRODUCTO_NO_EXISTE')
          }

          if (producto.stock < cantidad) {
            const quedan = producto.stock === 0
              ? `Nos quedamos sin "${producto.nombre}".`
              : `Solo quedan ${producto.stock} de "${producto.nombre}" y pediste ${cantidad}.`
            throw errorDeNegocio(quedan, 'STOCK_INSUFICIENTE')
          }

          const subtotal = Number(producto.precio) * cantidad
          total += subtotal
          detalles.push({ productoId, cantidad, subtotal })
        }

        const { rows: pedidoRows } = await conn.query(
          `INSERT INTO pedido (fecha, total, status, usuario_id)
           VALUES (CURRENT_DATE, $1, 'PENDIENTE', $2) RETURNING *`,
          [total, usuarioId]
        )
        const pedido = pedidoRows[0]

        for (const d of detalles) {
          await conn.query(
            'INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, subtotal) VALUES ($1, $2, $3, $4)',
            [pedido.id, d.productoId, d.cantidad, d.subtotal]
          )
          // El renglón sigue bloqueado por el SELECT ... FOR UPDATE de arriba,
          // así que el stock que validamos es el que estamos descontando.
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

  // --- Resolvers de relación ---
  Producto: {
    categoria: async (producto) => {
      if (!producto.categoria_id) return null
      const { rows } = await pool.query('SELECT * FROM categoria WHERE id = $1', [producto.categoria_id])
      return rows[0] || null
    },
  },

  Categoria: {
    productos: async (categoria) => {
      const { rows } = await pool.query('SELECT * FROM producto WHERE categoria_id = $1 ORDER BY id', [categoria.id])
      return rows
    },
  },

  Usuario: {
    pedidos: async (usuario) => {
      const { rows } = await pool.query('SELECT * FROM pedido WHERE usuario_id = $1', [usuario.id])
      return rows
    },
  },

  Pedido: {
    usuario: async (pedido) => {
      if (!pedido.usuario_id) return null
      const { rows } = await pool.query('SELECT * FROM usuario WHERE id = $1', [pedido.usuario_id])
      return rows[0] || null
    },
    detalles: async (pedido) => {
      const { rows } = await pool.query('SELECT * FROM detalle_pedido WHERE pedido_id = $1', [pedido.id])
      return rows
    },
  },

  DetallePedido: {
    producto: async (detalle) => {
      const { rows } = await pool.query('SELECT * FROM producto WHERE id = $1', [detalle.producto_id])
      return rows[0]
    },
  },
}
