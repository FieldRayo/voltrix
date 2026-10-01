// Alta de clientes. Devuelve los tokens OAuth para dejar la sesión abierta.
import { pool } from '../../lib/db.js'
import { emitirTokens, hashPassword, normalizarEmail, validarPasswordNueva } from '../../lib/auth.js'

const json = (cuerpo, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

export async function POST({ request }) {
  const { nombre, email, password } = await request.json().catch(() => ({}))
  const correo = normalizarEmail(email)
  const nombreLimpio = String(nombre ?? '').trim()

  if (!nombreLimpio || nombreLimpio.length > 150) return json({ error: 'Escribe tu nombre.' }, 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 150) {
    return json({ error: 'Escribe un correo válido.' }, 400)
  }
  const problema = validarPasswordNueva(password)
  if (problema) return json({ error: problema }, 400)

  try {
    const { rows } = await pool.query(
      'INSERT INTO usuario (nombre, email, password) VALUES ($1, $2, $3) RETURNING id',
      [nombreLimpio, correo, await hashPassword(password)]
    )
    return json(await emitirTokens(rows[0].id), 201)
  } catch (err) {
    if (err.code === '23505') return json({ error: 'Ya hay una cuenta con ese correo.' }, 409)
    throw err
  }
}
