import { CastelarNav } from "@/components/castelar-nav"

export default function CastelarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <CastelarNav />
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}
