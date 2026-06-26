import { useEffect } from 'react'
import { useStoreSettings } from './useStoreSettings'

export function useDocumentTitle(title: string) {
  const settings = useStoreSettings()

  useEffect(() => {
    const storeName = settings?.store_name?.trim() || 'Catalog'
    if (title.toLowerCase() === 'home') {
      document.title = storeName
    } else {
      document.title = `${title} | ${storeName}`
    }
  }, [title, settings?.store_name])
}
