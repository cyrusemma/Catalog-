import { Sparkle } from '@phosphor-icons/react'
import { useStoreSettings } from '../../hooks/useStoreSettings'

export default function AnnouncementBanner() {
  const settings = useStoreSettings()
  if (!settings.announcement_active || !settings.announcement_text?.trim()) return null

  const inner = (
    <div className="relative flex items-center bg-brand-400 text-white overflow-hidden py-2 px-4 h-9">
      <div className="flex animate-marquee whitespace-nowrap text-[12px] sm:text-xs font-medium items-center gap-2">
        <Sparkle size={12} weight="fill" className="flex-shrink-0" />
        <span className="mx-4">{settings.announcement_text}</span>
        <Sparkle size={12} weight="fill" className="flex-shrink-0" />
        <span className="mx-4">{settings.announcement_text}</span>
        <Sparkle size={12} weight="fill" className="flex-shrink-0" />
        <span className="mx-4">{settings.announcement_text}</span>
      </div>
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
