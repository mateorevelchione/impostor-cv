"use client"

import { useRouter } from "next/navigation"
import { CastelarView } from "@/components/castelar-view"
import { isSupabaseReady } from "@/lib/supabase-client"

export default function AdminPage() {
  const router = useRouter()
  return (
    <CastelarView
      onBack={() => router.push("/")}
      remoteEnabled={isSupabaseReady()}
    />
  )
}
