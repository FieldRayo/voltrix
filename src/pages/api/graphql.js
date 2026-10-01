import { yoga } from '../../lib/graphql.js'

// Yoga responde con su propia clase Response; Astro exige la nativa.
export async function ALL({ request }) {
  const r = await yoga.fetch(request)
  return new Response(r.body, { status: r.status, headers: r.headers })
}
