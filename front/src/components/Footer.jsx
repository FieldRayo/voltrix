// src/components/Footer.jsx
import { useState } from 'react'

export default function Footer() {
  const [correo, setCorreo] = useState('')
  const [enviado, setEnviado] = useState(false)

  const handleSuscribir = (e) => {
    e.preventDefault()
    if (!correo) return
    setEnviado(true)
    setCorreo('')
  }

  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-col">
          <h3 className="footer-brand">VOLTRIX</h3>
          <p>Tienda de componentes electrónicos para makers, estudiantes y talleres.</p>
        </div>

        <div className="footer-col">
          <h4>Categorías</h4>
          <ul>
            <li>Microcontroladores</li>
            <li>Sensores</li>
            <li>Displays</li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Ayuda</h4>
          <ul>
            <li>Preguntas frecuentes</li>
            <li>Envíos</li>
            <li>Devoluciones</li>
            <li>Contacto</li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Novedades</h4>
          <p>Déjanos tu correo y te avisamos de nuevos productos.</p>
          <form className="footer-form" onSubmit={handleSuscribir}>
            <input
              type="email"
              placeholder="tucorreo@ejemplo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
            />
            <button type="submit">Suscribirme</button>
          </form>
          {enviado && <p className="footer-ok">¡Gracias por suscribirte!</p>}

          <div className="footer-social">
            <span title="Facebook">FACEBOOK</span>
            <span title="Instagram">INSTAGRAM</span>
            <span title="X">X</span>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} VOLTRIX</p>
      </div>
    </footer>
  )
}
