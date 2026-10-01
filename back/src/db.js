// src/db.js
// Conexión a PostgreSQL (db.sql) con el pool de node-postgres.
import 'dotenv/config'
import pg from 'pg'

// node-postgres devuelve numeric/decimal como string para no perder precisión
// (un numeric(10,2) no siempre cabe exacto en un double de JS). Aquí los
// precios son chicos, así que los pasamos a número y el resto del código
// trabaja con Float como pide el schema GraphQL.
// ponytail: parseFloat alcanza para precios de tienda; si algún día se manejan
// montos grandes, quitar este parser y usar decimal.js en los cálculos.
pg.types.setTypeParser(1700, parseFloat)        // numeric
pg.types.setTypeParser(1082, (fecha) => fecha)  // date -> 'YYYY-MM-DD' tal cual

export const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'voltrix',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'voltrix',
  max: 10,
})
