export interface Person {
  id: string
  name: string
}

export function pickSecretPerson(people: Person[]): Person | null {
  if (!people.length) {
    return null
  }

  const index = Math.floor(Math.random() * people.length)
  return people[index]
}

export function generateImpostorIndices(totalPlayers: number, impostorCount: number) {
  const impostorIndices: number[] = []

  if (totalPlayers <= 0 || impostorCount <= 0) {
    return impostorIndices
  }

  const safeImpostorCount = Math.min(impostorCount, totalPlayers - 1)

  while (impostorIndices.length < safeImpostorCount) {
    const randomIndex = Math.floor(Math.random() * totalPlayers)
    if (!impostorIndices.includes(randomIndex)) {
      impostorIndices.push(randomIndex)
    }
  }

  return impostorIndices
}
