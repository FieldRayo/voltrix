// Sesión del cliente OAuth 2.0: pide tokens al token endpoint, los renueva
// con el refresh token y los manda como Bearer a la API GraphQL.
import { useSyncExternalStore } from 'react'

const CLAVE = 'voltrix-sesion'
const CLIENT_ID = 'voltrix-web'

// ponytail: tokens en localStorage, lo normal en una SPA con cliente público.
// Si algún día entra JS de terceros a la página, pasar a cookie httpOnly (BFF).
let sesion = null
const oyentes = new Set()

function leer() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE))
  } catch {
    return null
  }
}

function guardar(nueva) {
  sesion = nueva
  try {
    nueva ? localStorage.setItem(CLAVE, JSON.stringify(nueva)) : localStorage.removeItem(CLAVE)
  } catch {}
  oyentes.forEach((fn) => fn())
}

if (typeof window !== 'undefined') {
  sesion = leer()
  window.addEventListener('storage', (e) => {
    if (e.key !== CLAVE) return
    sesion = leer()
    oyentes.forEach((fn) => fn())
  })
}

const suscribir = (fn) => (oyentes.add(fn), () => oyentes.delete(fn))

// undefined mientras hidrata (todavía no sabemos), null sin sesión.
export const useSesion = () => useSyncExternalStore(suscribir, () => sesion, () => undefined)

async function pedirToken(params) {
  const res = await fetch('/api/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, ...params }),
  })
  const datos = await res.json()
  if (!res.ok) throw new Error(datos.error_description || 'No pudimos iniciar sesión.')
  return datos
}

// Guarda los tokens y completa la sesión con los datos del usuario.
async function abrirSesion(tokens) {
  const base = { ...tokens, expira: Date.now() + tokens.expires_in * 1000 }
  sesion = base
  const { yo } = await gql('{ yo { id nombre email rol } }')
  guardar({ ...base, usuario: yo })
}

export const iniciarSesion = (email, password) =>
  pedirToken({ grant_type: 'password', username: email, password }).then(abrirSesion)

export async function registrarse(nombre, email, password) {
  const res = await fetch('/api/registro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, email, password }),
  })
  const datos = await res.json()
  if (!res.ok) throw new Error(datos.error || 'No pudimos crear tu cuenta.')
  await abrirSesion(datos)
}

export async function cerrarSesion() {
  const token = sesion?.refresh_token
  guardar(null)
  if (token) {
    await fetch('/api/oauth/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token, client_id: CLIENT_ID }),
    }).catch(() => {})
  }
}

// Un solo refresh a la vez aunque varias peticiones lo necesiten juntas.
let renovando = null
function renovar() {
  renovando ??= pedirToken({ grant_type: 'refresh_token', refresh_token: sesion.refresh_token })
    .then((t) => guardar({ ...sesion, ...t, expira: Date.now() + t.expires_in * 1000 }))
    .catch((err) => {
      guardar(null)
      throw err
    })
    .finally(() => (renovando = null))
  return renovando
}

export async function gql(query, variables = {}) {
  // Renueva un minuto antes de que venza el access token.
  if (sesion?.refresh_token && sesion.expira - 60_000 < Date.now()) await renovar()

  let res
  try {
    res = await fetch('/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sesion && { Authorization: `Bearer ${sesion.access_token}` }),
      },
      body: JSON.stringify({ query, variables }),
    })
  } catch {
    const e = new Error('No pudimos conectar con la tienda. Revisa tu conexión.')
    e.codigo = 'SIN_CONEXION'
    throw e
  }

  const json = await res.json()
  if (json.errors) {
    const e = new Error(json.errors[0]?.message || 'No pudimos completar la operación.')
    // Con código es un error de negocio y el mensaje se puede mostrar tal cual.
    e.codigo = json.errors[0]?.extensions?.code
    if (e.codigo === 'UNAUTHENTICATED' && sesion) guardar(null)
    throw e
  }
  return json.data
}
