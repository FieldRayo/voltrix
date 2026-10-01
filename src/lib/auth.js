// Contraseñas (scrypt) y tokens OAuth 2.0 opacos guardados en PostgreSQL.
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { pool } from './db.js'

const scryptAsync = promisify(scrypt)

export const ACCESS_TTL = 60 * 60            // 1 hora
export const REFRESH_TTL = 60 * 60 * 24 * 30 // 30 días
const MAX_INTENTOS = 5
const BLOQUEO_MIN = 15

// --- Contraseñas ---

// Formato: scrypt$<salt hex>$<hash hex>. Parámetros por defecto de Node (N=16384).
export async function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = await scryptAsync(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

export async function verificarPassword(password, guardado) {
  const [alg, saltHex, hashHex] = String(guardado).split('$')
  if (alg !== 'scrypt' || !saltHex || !hashHex) return false
  const esperado = Buffer.from(hashHex, 'hex')
  const hash = await scryptAsync(password, Buffer.from(saltHex, 'hex'), esperado.length)
  return timingSafeEqual(hash, esperado)
}

// Hash de relleno: si el correo no existe igual se corre scrypt, para que el
// tiempo de respuesta no delate qué correos están registrados.
const HASH_RELLENO = await hashPassword(randomBytes(16).toString('hex'))

export function validarPasswordNueva(password) {
  if (typeof password !== 'string' || password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  if (password.length > 128) return 'La contraseña es demasiado larga.'
  return null
}

// Devuelve el usuario si correo y contraseña son correctos, o null.
// Tras MAX_INTENTOS fallidos la cuenta queda bloqueada BLOQUEO_MIN minutos.
// ponytail: el bloqueo es por cuenta; un límite por IP necesita un store
// compartido (Netlify Edge rate limiting o Redis).
export async function autenticar(email, password) {
  const { rows } = await pool.query('SELECT * FROM usuario WHERE email = $1', [normalizarEmail(email)])
  const usuario = rows[0]
  const ok = await verificarPassword(password, usuario?.password ?? HASH_RELLENO)
  if (!usuario) return null

  if (usuario.bloqueado_hasta && usuario.bloqueado_hasta > new Date()) return null

  if (!ok) {
    await pool.query(
      `UPDATE usuario
          SET intentos_fallidos = intentos_fallidos + 1,
              bloqueado_hasta = CASE WHEN intentos_fallidos + 1 >= $2
                                     THEN now() + make_interval(mins => $3) END
        WHERE id = $1`,
      [usuario.id, MAX_INTENTOS, BLOQUEO_MIN]
    )
    return null
  }

  if (usuario.intentos_fallidos) {
    await pool.query('UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = $1', [usuario.id])
  }
  return usuario
}

export const normalizarEmail = (email) => String(email ?? '').trim().toLowerCase()

// --- Tokens ---

const sha256 = (token) => createHash('sha256').update(token).digest('hex')

// Emite un par access + refresh de la misma familia (RFC 6749 §5.1).
export async function emitirTokens(usuarioId, familia = randomUUID()) {
  const access = randomBytes(32).toString('base64url')
  const refresh = randomBytes(32).toString('base64url')
  await pool.query(
    `INSERT INTO oauth_token (hash, tipo, familia, usuario_id, expira) VALUES
       ($1, 'access',  $3, $4, now() + make_interval(secs => $5)),
       ($2, 'refresh', $3, $4, now() + make_interval(secs => $6))`,
    [sha256(access), sha256(refresh), familia, usuarioId, ACCESS_TTL, REFRESH_TTL]
  )
  // Limpieza oportunista de tokens vencidos; evita un cron.
  pool.query('DELETE FROM oauth_token WHERE expira < now()').catch(() => {})
  return {
    access_token: access,
    token_type: 'Bearer',
    expires_in: ACCESS_TTL,
    refresh_token: refresh,
  }
}

// Canjea un refresh token: el viejo se consume (rotación) y la familia sigue.
// Si alguien reusa un refresh ya consumido, no lo encuentra y le toca volver a
// iniciar sesión.
export async function canjearRefresh(refresh) {
  const { rows } = await pool.query(
    `DELETE FROM oauth_token
      WHERE hash = $1 AND tipo = 'refresh' AND expira > now()
  RETURNING usuario_id, familia`,
    [sha256(String(refresh))]
  )
  if (!rows[0]) return null
  const { usuario_id, familia } = rows[0]
  // El access anterior de la familia queda inválido junto con su refresh.
  await pool.query(`DELETE FROM oauth_token WHERE familia = $1 AND tipo = 'access'`, [familia])
  return emitirTokens(usuario_id, familia)
}

// RFC 7009: revocar cualquiera de los dos tokens cierra la sesión completa.
export async function revocar(token) {
  await pool.query(
    'DELETE FROM oauth_token WHERE familia = (SELECT familia FROM oauth_token WHERE hash = $1)',
    [sha256(String(token))]
  )
}

// Usuario dueño de un access token vigente, o null.
export async function usuarioDeToken(access) {
  if (!access) return null
  const { rows } = await pool.query(
    `SELECT u.id, u.nombre, u.email, u.rol
       FROM oauth_token t JOIN usuario u ON u.id = t.usuario_id
      WHERE t.hash = $1 AND t.tipo = 'access' AND t.expira > now()`,
    [sha256(access)]
  )
  return rows[0] || null
}

export function bearer(request) {
  const m = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') || '')
  return m ? m[1] : null
}
