import { cerrarSesion, useSesion } from '../lib/sesion.js'

export default function MenuUsuario() {
  const sesion = useSesion()
  if (sesion === undefined) return null
  if (!sesion) {
    return (
      <a className="nav-boton" href="/login">
        Iniciar sesión
      </a>
    )
  }
  return (
    <>
      <a className="nav-boton" href="/cuenta">
        {sesion.usuario?.nombre.split(' ')[0] || 'Mi cuenta'}
      </a>
      <button
        className="nav-boton"
        type="button"
        onClick={() => cerrarSesion().then(() => location.assign('/'))}
      >
        Salir
      </button>
    </>
  )
}
