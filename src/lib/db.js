// Pool de PostgreSQL. En Netlify la URL la pone Netlify DB (NETLIFY_DATABASE_URL);
// en local va en .env como DATABASE_URL.
import pg from 'pg'

// numeric llega como string para no perder precisión.
// ponytail: parseFloat alcanza para precios de tienda; con montos grandes,
// quitar este parser y calcular con decimal.js.
pg.types.setTypeParser(1700, parseFloat)       // numeric
pg.types.setTypeParser(1082, (fecha) => fecha) // date -> 'YYYY-MM-DD'

const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL

// ponytail: un pool chico por instancia de función; si el tráfico crece, usar
// el pooler de Neon (URL con -pooler) en lugar de subir max.
export const pool = new pg.Pool({ connectionString, max: 5 })
