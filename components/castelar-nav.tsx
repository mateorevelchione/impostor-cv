"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Settings, X, ChevronLeft } from "lucide-react"
import { unlockAdmin } from "@/lib/admin-session"

export function CastelarNav() {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [pin, setPin] = useState("")
  const [pinError, setPinError] = useState("")

  const openModal = () => { setShowModal(true); setPin(""); setPinError("") }
  const closeModal = () => { setShowModal(false); setPin(""); setPinError("") }

  const handleSubmit = () => {
    if (unlockAdmin(pin)) {
      closeModal()
      router.push("/admin")
    } else {
      setPinError("PIN incorrecto.")
    }
  }

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Left: back + title */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              <ChevronLeft size={15} />
              <span className="hidden sm:inline">Menú</span>
            </Link>
            <span className="text-border">|</span>
            <Link href="/castelar" className="font-bold text-foreground hover:text-primary transition-colors tracking-tight">
              Castelar
            </Link>
          </div>

          {/* Right: icons only */}
          <div className="flex items-center gap-1">
            <Link
              href="/castelar/equipos"
              className="px-3 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <span className="hidden sm:inline">Generador de equipos</span>
              <span className="sm:hidden">Equipos</span>
            </Link>
            <Link
              href="/castelar/partidos"
              className="px-3 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Partidos
            </Link>
            <button
              onClick={openModal}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Configuración"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* Admin PIN modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-xs p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-foreground text-sm">Acceso administrador</h2>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground text-center text-2xl tracking-widest focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="····"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit() }}
            />
            {pinError && <p className="text-xs text-destructive">{pinError}</p>}
            <button
              onClick={handleSubmit}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition-all"
            >
              Ingresar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
