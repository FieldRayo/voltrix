// src/context/CartContext.jsx
// Context API + useReducer para manejar el carrito en toda la app.
import { createContext, useContext, useReducer } from 'react'

const CartContext = createContext(null)

// El stock que mandó el backend es el tope del carrito. Es solo para que el
// cliente no pida de más; quien manda es la validación del servidor, que lee
// el stock del momento.
function topeStock(item, cantidad) {
  const n = Number.isFinite(cantidad) ? Math.trunc(cantidad) : 1
  return Math.min(Math.max(1, n), item.stock)
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'AGREGAR': {
      const producto = action.payload
      if (producto.stock < 1) return state

      const existente = state.items.find((it) => it.id === producto.id)
      if (existente) {
        return {
          items: state.items.map((it) =>
            it.id === producto.id ? { ...it, cantidad: topeStock(it, it.cantidad + 1) } : it
          ),
        }
      }
      return { items: [...state.items, { ...producto, cantidad: 1 }] }
    }

    case 'QUITAR':
      return { items: state.items.filter((it) => it.id !== action.payload) }

    case 'CAMBIAR_CANTIDAD':
      return {
        items: state.items.map((it) =>
          it.id === action.payload.id
            ? { ...it, cantidad: topeStock(it, action.payload.cantidad) }
            : it
        ),
      }

    case 'VACIAR':
      return { items: [] }

    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] })

  const agregarAlCarrito = (producto) => dispatch({ type: 'AGREGAR', payload: producto })
  const quitarDelCarrito = (id) => dispatch({ type: 'QUITAR', payload: id })
  const cambiarCantidad = (id, cantidad) =>
    dispatch({ type: 'CAMBIAR_CANTIDAD', payload: { id, cantidad } })
  const vaciarCarrito = () => dispatch({ type: 'VACIAR' })

  const total = state.items.reduce((sum, it) => sum + it.precio * it.cantidad, 0)
  const totalItems = state.items.reduce((sum, it) => sum + it.cantidad, 0)

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        agregarAlCarrito,
        quitarDelCarrito,
        cambiarCantidad,
        vaciarCarrito,
        total,
        totalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
