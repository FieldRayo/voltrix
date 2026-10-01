// Revocación de tokens (RFC 7009). Siempre responde 200, exista o no el token.
import { revocar } from '../../../lib/auth.js'

export async function POST({ request }) {
  const token = new URLSearchParams(await request.text()).get('token')
  if (token) await revocar(token)
  return new Response(null, { status: 200 })
}
