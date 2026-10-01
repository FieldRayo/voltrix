// Lecturas del catálogo para las páginas renderizadas en el servidor.
import { pool } from './db.js'

const varios = async (sql, params) => (await pool.query(sql, params)).rows

export const categorias = () => varios('SELECT id, nombre FROM categoria ORDER BY id')
export const productos = () => varios('SELECT * FROM producto ORDER BY id')
export const productosDeCategoria = (id) =>
  varios('SELECT * FROM producto WHERE categoria_id = $1 ORDER BY id', [id])
export const categoria = async (id) => (await varios('SELECT * FROM categoria WHERE id = $1', [id]))[0]
export const producto = async (id) =>
  (
    await varios(
      `SELECT p.*, c.nombre AS categoria_nombre
         FROM producto p LEFT JOIN categoria c ON c.id = p.categoria_id
        WHERE p.id = $1`,
      [id]
    )
  )[0]

// Ids de la URL: solo enteros positivos, lo demás es 404.
export const idValido = (s) => (/^[1-9]\d{0,8}$/.test(s ?? '') ? Number(s) : null)
