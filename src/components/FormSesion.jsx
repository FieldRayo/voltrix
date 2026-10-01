// Formulario de inicio de sesión y de registro (modo="registro").
import { useState } from 'react'
import { iniciarSesion, registrarse } from '../lib/sesion.js'

// Solo rutas internas, para que ?siguiente= no sirva para mandar a otro sitio.
function destino() {
  const s = new URLSearchParams(location.search).get('siguiente') || '/cuenta'
  return s.startsWith('/') && !s.startsWith('//') ? s : '/cuenta'
}

export default function FormSesion({ modo = 'login' }) {
  const registro = modo === 'registro'
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const enviar = async (e) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setEnviando(true)
    setError('')
    try {
      if (registro) await registrarse(f.get('nombre'), f.get('email'), f.get('password'))
      else await iniciarSesion(f.get('email'), f.get('password'))
      location.assign(destino())
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  return (
    <form className="panel form" onSubmit={enviar}>
      <h1>{registro ? 'Crear cuenta' : 'Iniciar sesión'}</h1>
      {registro && (
        <label>
          Nombre
          <input name="nombre" required maxLength={150} autoComplete="name" />
        </label>
      )}
      <label>
        Correo
        <input name="email" type="email" required maxLength={150} autoComplete="email" />
      </label>
      <label>
        Contraseña
        <input
          name="password"
          type="password"
          required
          minLength={registro ? 8 : undefined}
          maxLength={128}
          autoComplete={registro ? 'new-password' : 'current-password'}
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="btn-primario" type="submit" disabled={enviando}>
        {enviando ? 'Un momento…' : registro ? 'Crear cuenta' : 'Entrar'}
      </button>
      <p className="form-alterno">
        {registro ? (
          <>¿Ya tienes cuenta? <a href="/login">Inicia sesión</a></>
        ) : (
          <>¿Primera vez? <a href="/registro">Crea tu cuenta</a></>
        )}
      </p>
    </form>
  )
}
