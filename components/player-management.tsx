"use client"

import type React from "react"

import { useState, useRef } from "react"
import { ChevronLeft, Plus, Trash2, Upload } from "lucide-react"

interface PlayerManagementProps {
  people: Array<{ id: string; name: string }>
  onAddPerson: (name: string) => void
  onDeletePerson: (id: string) => void
  onImportJSON: (jsonData: Array<{ id: string; name: string }>) => void
  onBack: () => void
  errorMessage?: string | null
  remoteEnabled?: boolean
}

export function PlayerManagement({
  people,
  onAddPerson,
  onDeletePerson,
  onImportJSON,
  onBack,
  errorMessage,
  remoteEnabled = false,
}: PlayerManagementProps) {
  const [newPersonName, setNewPersonName] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [importError, setImportError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddPerson = () => {
    if (newPersonName.trim()) {
      onAddPerson(newPersonName.trim())
      setNewPersonName("")
      setShowAddForm(false)
    }
  }

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const jsonData = JSON.parse(content)

        // Support both simple array and object with personas array
        const peopleArray = Array.isArray(jsonData) ? jsonData : jsonData.personas || []

        if (!Array.isArray(peopleArray) || peopleArray.length === 0) {
          setImportError("El archivo debe contener un array de personas")
          return
        }

        const transformedPeople = peopleArray.map((person, index) => ({
          id: person.id || `imported_${Date.now()}_${index}`,
          name: person.username || person.name || "",
        }))

        onImportJSON(transformedPeople)
        setImportError("")

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      } catch (error) {
        setImportError("Error al procesar el archivo JSON")
        console.error(error)
      }
    }
    reader.readAsText(file)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-veggie-green to-veggie-light p-4 flex flex-col">
      <button
        onClick={onBack}
        className="self-start mb-6 flex items-center gap-2 text-white font-semibold hover:opacity-80 transition-opacity"
      >
        <ChevronLeft size={24} />
        Volver
      </button>

      <div className="flex-1">
        <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-veggie-dark mb-6 text-center">Gestionar Personas</h1>
          <p className="text-center text-xs text-veggie-text mb-4">
            Base {remoteEnabled ? "sincronizada en la nube" : "guardada en este dispositivo"}
          </p>
          {errorMessage && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">{errorMessage}</p>}

          {/* People List */}
          <div className="mb-8 max-h-64 overflow-y-auto">
            {people.length === 0 ? (
              <p className="text-center text-veggie-text py-8">No hay personas aún</p>
            ) : (
              <div className="space-y-3">
                {people.map((person) => (
                  <div key={person.id} className="flex items-center justify-between bg-veggie-light rounded-lg p-4">
                    <span className="font-semibold text-veggie-dark">{person.name}</span>
                    <button
                      onClick={() => onDeletePerson(person.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      aria-label="Eliminar persona"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Person Form */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-veggie-light rounded-xl">
              <input
                type="text"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAddPerson()
                  }
                }}
                placeholder="Nombre y Apellido"
                className="w-full px-4 py-2 rounded-lg border border-veggie-green focus:outline-none focus:ring-2 focus:ring-veggie-green mb-3"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddPerson}
                  className="flex-1 bg-veggie-green text-white font-bold py-2 rounded-lg hover:bg-veggie-green-dark transition-colors"
                >
                  Agregar
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setNewPersonName("")
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full bg-veggie-orange text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-veggie-orange-dark transition-colors mb-4"
            >
              <Plus size={20} />
              Agregar Persona
            </button>
          )}

          <div className="mt-8 p-4 bg-veggie-light rounded-xl border-2 border-dashed border-veggie-green">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
              aria-label="Importar JSON"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 text-veggie-dark font-semibold hover:opacity-80 transition-opacity"
            >
              <Upload size={20} />
              Importar JSON
            </button>

            {importError && <p className="text-sm text-red-500 mt-2 text-center">{importError}</p>}
            <p className="text-xs text-veggie-text text-center mt-2">
              Sube un archivo JSON con más seguidores de Instagram
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
