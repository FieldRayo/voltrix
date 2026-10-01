// Token endpoint OAuth 2.0 (RFC 6749): grants "password" (§4.3) y
// "refresh_token" (§6). Cliente público único: el front de la tienda.
import { autenticar, canjearRefresh, emitirTokens } from '../../../lib/auth.js'

const CLIENT_ID = process.env.OAUTH_CLIENT_ID || 'voltrix-web'

const responder = (cuerpo, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Pragma: 'no-cache' },
  })

const error = (codigo, descripcion, status = 400) =>
  responder({ error: codigo, error_description: descripcion }, status)

export async function POST({ request }) {
  if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) {
    return error('invalid_request', 'Se espera application/x-www-form-urlencoded.')
  }
  const p = new URLSearchParams(await request.text())

  if (p.get('client_id') !== CLIENT_ID) return error('invalid_client', 'Cliente desconocido.', 401)

  switch (p.get('grant_type')) {
    case 'password': {
      const username = p.get('username')
      const password = p.get('password')
      if (!username || !password) return error('invalid_request', 'Faltan username o password.')
      const usuario = await autenticar(username, password)
      if (!usuario) return error('invalid_grant', 'Correo o contraseña incorrectos.')
      return responder(await emitirTokens(usuario.id))
    }
    case 'refresh_token': {
      const tokens = p.get('refresh_token') && (await canjearRefresh(p.get('refresh_token')))
      if (!tokens) return error('invalid_grant', 'La sesión expiró. Vuelve a iniciar sesión.')
      return responder(tokens)
    }
    default:
      return error('unsupported_grant_type', 'Usa grant_type=password o refresh_token.')
  }
}
