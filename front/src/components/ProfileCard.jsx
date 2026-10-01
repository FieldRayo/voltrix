import { useState } from 'react'

export default function ProfileCard({ nombre, rol, practica, foto }) {
  const [meGusta, setMeGusta] = useState(false)

  return (
    <article className="perfil-card">
      <img src={foto} alt={`Foto de ${nombre}`} width="104" height="104" />
      <h2>{nombre}</h2>
      <p className="rol">{rol}</p>
      <p className="practica">{practica}</p>
      <button
        className={meGusta ? 'activo' : ''}
        type="button"
        aria-pressed={meGusta}
        onClick={() => setMeGusta(!meGusta)}
      >
        {meGusta ? 'Ya no me gusta' : 'Me gusta'} ({meGusta ? 1 : 0})
      </button>
    </article>
  )
}
