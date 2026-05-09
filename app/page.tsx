"use client"

import Link from "next/link"

const communities = [
  {
    id: "castelar",
    name: "Castelar",
    description: "",
    href: "/castelar",
    available: true,
  },
]

export default function CommunitySelector() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a2a0a_0%,_transparent_55%)] pointer-events-none" />

      <div className="relative w-full max-w-sm space-y-10">
        <div className="text-center space-y-2">
          <div className="text-5xl mb-3">🥬🍅</div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Comunidad Veggie</h1>
          <p className="text-muted-foreground text-sm"> </p>
        </div>

        <div className="space-y-3">
          {communities.map((c) =>
            c.available ? (
              <Link key={c.id} href={c.href}>
                <div className="group bg-card border border-border hover:border-primary/50 rounded-2xl px-5 py-4 flex items-center justify-between transition-all duration-200 cursor-pointer">
                  <div>
                    <p className="font-bold text-foreground text-lg">{c.name}</p>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </Link>
            ) : null
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">Próximamente más...</p>
      </div>
    </main>
  )
}
