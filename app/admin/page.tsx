"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Sliders } from "lucide-react"
import { CastelarView } from "@/components/castelar-view"
import { isSupabaseReady } from "@/lib/supabase-client"

export default function AdminPage() {
  const router = useRouter()
  return (
    <>
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <Link
          href="/admin/puntajes"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border text-sm font-semibold text-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          <Sliders size={15} />
          Puntajes para armar equipos
        </Link>
      </div>
      <CastelarView
        onBack={() => router.push("/")}
        remoteEnabled={isSupabaseReady()}
      />
    </>
  )
}
