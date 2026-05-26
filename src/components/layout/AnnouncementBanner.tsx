import { Sparkle } from '@phosphor-icons/react'
import { useStoreSettings } from '../../hooks/useStoreSettings'

export default function AnnouncementBanner() {
  const settings = useStoreSettings()
  if (!settings.announcement_active || !settings.announcement_text?.trim()) return null

  const inner = (
    <div className="flex items-center justify-center gap-2 px-4 py-2 text-center text-[12px] sm:text-xs font-medium text-white bg-gradient-to-r from-brand-400 via-brand-500 to-brand-400 bg-[length:200%_100%] animate-gradient-x">
      <Sparkle size={12} weight="fill" className="flex-shrink-0" />
      <span className="truncate">{settings.announcement_text}</span>
    </div>
  )

  if (settings.announcement_link) {
    const href = settings.announcement_link
    const isExternal = /^https?:\/\//i.test(href)
    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noreferrer' : undefined}
        className="block hover:brightness-110 transition"
      >
        {inner}
      </a>
    )
  }

  return inner
}
