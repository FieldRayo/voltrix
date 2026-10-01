// Crea un administrador o sube a ADMIN a un usuario existente.
//   npm run crear-admin -- correo@dominio.com "Nombre" 'contraseña'
import { pool } from '../src/lib/db.js'
import { hashPassword, normalizarEmail, validarPasswordNueva } from '../src/lib/auth.js'

const [email, nombre, password] = process.argv.slice(2)
if (!email || !nombre || !password) {
  console.error('Uso: npm run crear-admin -- correo "Nombre" contraseña')
  process.exit(1)
}
const problema = validarPasswordNueva(password)
if (problema) {
  console.error(problema)
  process.exit(1)
}

await pool.query(
  `INSERT INTO usuario (nombre, email, password, rol) VALUES ($1, $2, $3, 'ADMIN')
   ON CONFLICT (email) DO UPDATE SET nombre = $1, password = $3, rol = 'ADMIN'`,
  [nombre, normalizarEmail(email), await hashPassword(password)]
)
console.log('Admin listo:', normalizarEmail(email))
await pool.end()
