"use client"

import { useState } from "react"
import { CastelarView } from "@/components/castelar-view"
import { isSupabaseReady } from "@/lib/supabase-client"

export default function Home() {
  const [gameState, setGameState] = useState<"menu" | "castelar">("menu")
  const remoteEnabled = isSupabaseReady()

  const handleBackToMenu = () => {
    setGameState("menu")
  }

  if (gameState === "menu") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-veggie-green to-veggie-light flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            <div className="mb-8">
              <div className="text-5xl mb-3">🌱</div>
              <h1 className="text-3xl font-bold text-veggie-dark mb-2">Comunidad Veggie</h1>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setGameState("castelar")}
                className="relative w-full bg-gradient-to-r from-veggie-green to-veggie-orange rounded-xl shadow-lg p-4 cursor-pointer hover:shadow-xl transition-all duration-200 flex items-center justify-between"
              >
                <div className="absolute inset-0 bg-white/20 rounded-xl" />
                <div className="relative z-10 flex items-center gap-4">
                  <span className="text-4xl">⚽️</span>
                  <h2 className="text-2xl font-bold text-white">Castelar</h2>
                </div>
                <span className="relative z-10 text-white text-lg">→</span>
              </button>
            </div>

            {!remoteEnabled && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mt-6">
                Necesitas Supabase configurado para usar Castelar.
              </p>
            )}
          </div>
        </div>
      </main>
    )
  }

  if (gameState === "castelar") {
    return <CastelarView onBack={handleBackToMenu} remoteEnabled={remoteEnabled} />
  }

  return null
}
