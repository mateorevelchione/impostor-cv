import { ADMIN_PIN } from "./config"

// Once the admin enters the PIN (anywhere — the nav gear or inside the panel),
// we remember it for the browser session so it is never asked again.
const KEY = "castelar_admin_unlocked"

export function isAdminUnlocked(): boolean {
  if (typeof window === "undefined") return false
  return window.sessionStorage.getItem(KEY) === "1"
}

/** Returns true if the PIN was correct (and persists the unlocked state). */
export function unlockAdmin(pin: string): boolean {
  if (pin.trim() !== ADMIN_PIN) return false
  if (typeof window !== "undefined") window.sessionStorage.setItem(KEY, "1")
  return true
}

export function lockAdmin() {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(KEY)
}
