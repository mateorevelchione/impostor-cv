"use client"

import { useEffect, useState } from "react"

interface GameTimerProps {
  duration: number
  onEnd: () => void
}

export function GameTimer({ duration, onEnd }: GameTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration)

  useEffect(() => {
    if (timeLeft <= 0) {
      onEnd()
      return
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [timeLeft, onEnd])

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-veggie-text">Se oculta en:</p>
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-veggie-green to-veggie-orange flex items-center justify-center">
        <span className="text-4xl font-bold text-white">{timeLeft}</span>
      </div>
    </div>
  )
}
