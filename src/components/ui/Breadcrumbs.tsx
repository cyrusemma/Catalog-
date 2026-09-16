import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-gray-500 dark:text-gray-400 ${className}`}>
      <ol className="flex items-center flex-wrap gap-1.5" itemScope itemType="https://schema.org/BreadcrumbList">
        {/* Home Root */}
        <li
          className="flex items-center gap-1.5"
          itemProp="itemListElement"
          itemScope
          itemType="https://schema.org/ListItem"
        >
          <Link
            to="/"
            itemProp="item"
            className="flex items-center gap-1 hover:text-amber-500 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span itemProp="name" className="sr-only sm:not-sr-only">Home</span>
          </Link>
          <meta itemProp="position" content="1" />
        </li>

        {/* Dynamic Items */}
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const position = index + 2

          return (
            <li
              key={index}
              className="flex items-center gap-1.5"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  itemProp="item"
                  className="hover:text-amber-500 transition-colors truncate max-w-[140px] sm:max-w-xs"
                >
                  <span itemProp="name">{item.label}</span>
                </Link>
              ) : (
                <span
                  itemProp="name"
                  className="font-semibold text-gray-800 dark:text-white truncate max-w-[140px] sm:max-w-xs"
                >
                  {item.label}
                </span>
              )}
              <meta itemProp="position" content={String(position)} />
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
