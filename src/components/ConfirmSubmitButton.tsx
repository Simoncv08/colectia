'use client'

import type { ReactNode, MouseEvent } from 'react'

// Pide confirmación antes de enviar, para acciones que no se pueden deshacer.
export default function ConfirmSubmitButton({
  children,
  confirmMessage,
  className,
  ariaLabel,
}: {
  children: ReactNode
  confirmMessage: string
  className?: string
  ariaLabel?: string
}) {
  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(confirmMessage)) {
      e.preventDefault()
    }
  }

  return (
    <button type="submit" className={className} onClick={handleClick} aria-label={ariaLabel}>
      {children}
    </button>
  )
}
