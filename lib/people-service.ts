import { ensureSupabase } from "./supabase-client"
import type { Person } from "./game-logic"

export type RemotePersonPayload = {
  id?: string
  name: string
}

export async function fetchPeopleFromRemote(): Promise<Person[]> {
  const supabase = ensureSupabase()
  const batchSize = 1000
  let from = 0
  const results: Person[] = []

  // Supabase devuelve como máximo 1k filas por request; hacemos paginación manual.
  while (true) {
    const { data, error } = await supabase
      .from("people")
      .select("id, name")
      .order("name")
      .range(from, from + batchSize - 1)

    if (error) {
      throw error
    }

    if (!data || data.length === 0) {
      break
    }

    results.push(...data)

    if (data.length < batchSize) {
      break
    }

    from += batchSize
  }

  return results
}

export async function addPersonRemote(name: string): Promise<Person> {
  const supabase = ensureSupabase()
  const { data, error } = await supabase
    .from("people")
    .insert({ name })
    .select("id, name")
    .single()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error("No se pudo crear la persona en supabase.")
  }

  return data
}

export async function deletePersonRemote(id: string): Promise<void> {
  const supabase = ensureSupabase()
  const { error } = await supabase.from("people").delete().eq("id", id)

  if (error) {
    throw error
  }
}

export async function bulkInsertPeopleRemote(people: RemotePersonPayload[]): Promise<void> {
  if (people.length === 0) return
  const supabase = ensureSupabase()
  const payload = people.map(({ id, name }) => ({
    ...(id ? { id } : {}),
    name,
  }))

  const { error } = await supabase.from("people").upsert(payload, {
    onConflict: "id",
    ignoreDuplicates: false,
  })

  if (error) {
    throw error
  }
}

