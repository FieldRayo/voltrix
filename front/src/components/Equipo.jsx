// src/components/Equipo.jsx
// Vista que reutiliza la práctica 1: carga simulada con useEffect + tarjetas
// con estado propio (ProfileCard). No toca el backend a propósito.
import { useEffect, useState } from 'react'
import ProfileCard from './ProfileCard.jsx'
import { perfiles } from '../data/perfiles.js'

export default function Equipo() {
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setLista(perfiles)
      setCargando(false)
    }, 1000)

    return () => clearTimeout(temporizador)
  }, [])

  return (
    <section>
      <span className="etiqueta">Equipo Voltrix</span>
      <h2>Quiénes armamos la tienda</h2>
      <p className="introduccion">Personas, habilidades e ideas que construyen experiencias digitales.</p>

      {cargando ? (
        <p className="cargando" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          Cargando perfiles...
        </p>
      ) : (
        <div className="grid-perfiles" aria-label="Perfiles del equipo">
          {lista.map((perfil) => (
            <ProfileCard key={perfil.id} {...perfil} />
          ))}
        </div>
      )}
    </section>
  )
}
