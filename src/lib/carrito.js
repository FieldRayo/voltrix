// Carrito compartido entre islas de React. Vive en localStorage para que
// sobreviva a la navegación entre páginas y se sincroniza entre pestañas.
import { useSyncExternalStore } from 'react'

const CLAVE = 'voltrix-carrito'
const VACIO = []

// El stock que mandó el servidor es el tope. Solo evita pedir de más; quien
// manda es crearPedido, que valida contra el stock del momento.
function topeStock(item, cantidad) {
  const n = Number.isFinite(cantidad) ? Math.trunc(cantidad) : 1
  return Math.min(Math.max(1, n), item.stock)
}

export function carritoReducer(items, accion) {
  switch (accion.type) {
    case 'AGREGAR': {
      const p = accion.payload
      if (p.stock < 1) return items
      if (items.some((it) => it.id === p.id)) {
        return items.map((it) => (it.id === p.id ? { ...it, cantidad: topeStock(it, it.cantidad + 1) } : it))
      }
      return [...items, { id: p.id, nombre: p.nombre, precio: p.precio, imagen: p.imagen, stock: p.stock, cantidad: 1 }]
    }
    case 'QUITAR':
      return items.filter((it) => it.id !== accion.payload)
    case 'CAMBIAR_CANTIDAD':
      return items.map((it) =>
        it.id === accion.payload.id ? { ...it, cantidad: topeStock(it, accion.payload.cantidad) } : it
      )
    case 'VACIAR':
      return VACIO
    default:
      return items
  }
}

let items = VACIO
const oyentes = new Set()

function leer() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE))
    return Array.isArray(guardado) ? guardado : VACIO
  } catch {
    return VACIO
  }
}

if (typeof window !== 'undefined') {
  items = leer()
  window.addEventListener('storage', (e) => {
    if (e.key !== CLAVE) return
    items = leer()
    oyentes.forEach((fn) => fn())
  })
}

export function despachar(accion) {
  items = carritoReducer(items, accion)
  try {
    localStorage.setItem(CLAVE, JSON.stringify(items))
  } catch {
    // Sin storage (modo privado estricto) el carrito vive solo en esta página.
  }
  oyentes.forEach((fn) => fn())
}

const suscribir = (fn) => (oyentes.add(fn), () => oyentes.delete(fn))

export function useCarrito() {
  const lista = useSyncExternalStore(suscribir, () => items, () => VACIO)
  return {
    items: lista,
    total: lista.reduce((s, it) => s + it.precio * it.cantidad, 0),
    totalItems: lista.reduce((s, it) => s + it.cantidad, 0),
  }
}

export const dinero = (n) =>
  Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
