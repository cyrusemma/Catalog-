import { useState, useEffect } from 'react'
import type { ImgHTMLAttributes } from 'react'
import { ImageSquare } from '@phosphor-icons/react'

interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** If true, skips lazy loading and intersection observer fading */
  priority?: boolean
  /** Fallback URL or a generic placeholder if the image fails to load */
  fallback?: React.ReactNode | string
}

export default function Image({ 
  src, 
  alt, 
  className = '', 
  priority = false, 
  fallback,
  ...props 
}: ImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  // Reset states if src changes
  useEffect(() => {
    setIsLoaded(false)
    setHasError(false)
  }, [src])

  const handleError = () => {
    setHasError(true)
    setIsLoaded(true) // Treat error as loaded to show fallback
  }

  const handleLoad = () => {
    setIsLoaded(true)
  }

  const imageSrc = hasError && typeof fallback === 'string' ? fallback : src
  const showPlaceholder = hasError && typeof fallback !== 'string'

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {showPlaceholder ? (
        <div className="absolute inset-0 flex items-center justify-center bg-dark-100 dark:bg-dark-800 text-dark-800/20 dark:text-white/20">
          {fallback || <ImageSquare size={24} weight="duotone" />}
        </div>
      ) : (
        <>
          {/* Optional skeleton/background while loading */}
          {!isLoaded && !priority && (
            <div className="absolute inset-0 bg-gradient-to-br from-cream-100 to-cream-200 dark:from-dark-800 dark:to-dark-700 animate-pulse" />
          )}
          
          <img
            src={imageSrc}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            loading={priority ? 'eager' : 'lazy'}
            decoding={priority ? 'sync' : 'async'}
            className={`w-full h-full transition-opacity duration-500 ease-out ${
              isLoaded || priority ? 'opacity-100' : 'opacity-0'
            }`}
            {...props}
          />
        </>
      )}
    </div>
  )
}
