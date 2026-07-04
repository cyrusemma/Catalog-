import imageCompression from 'browser-image-compression'

export interface ImageOptimizationOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
  useWebWorker?: boolean
  fileType?: string
  initialQuality?: number
}

const DEFAULT_OPTIONS: ImageOptimizationOptions = {
  maxSizeMB: 0.8, // 800KB target
  maxWidthOrHeight: 1200, // Maximum dimensions
  useWebWorker: true,
  fileType: 'image/webp', // Default to WebP for superior compression
  initialQuality: 0.8,
}

/**
 * Compresses an image file in the browser before upload.
 * Defaults to converting the image to WebP with a max width of 1200px.
 * 
 * @param file The original File object from an input element
 * @param customOptions Optional overrides for the compression settings
 * @returns A compressed File (or Blob) object
 */
export async function compressImage(file: File | Blob, customOptions?: ImageOptimizationOptions): Promise<File | Blob> {
  const isWebPRequested = (customOptions?.fileType || DEFAULT_OPTIONS.fileType) === 'image/webp'
  
  // If the file is a GIF, we generally don't want to compress it with standard algorithms
  // as it will break the animation. Return as-is or handle specially if needed.
  if (file.type === 'image/gif') {
    return file
  }

  const options = {
    ...DEFAULT_OPTIONS,
    ...customOptions,
  }

  try {
    // browser-image-compression requires a File object in some versions/browsers.
    // Ensure we have a File object with a name.
    const fileObj = file instanceof File 
      ? file 
      : new File([file], `image.${isWebPRequested ? 'webp' : file.type.split('/')[1] || 'jpg'}`, { type: file.type })

    const compressedBlob = await imageCompression(fileObj, options)
    
    // Return a File object to maintain compatibility with most upload handlers
    return new File(
      [compressedBlob], 
      fileObj.name.replace(/\.[^/.]+$/, "") + (isWebPRequested ? '.webp' : `.${compressedBlob.type.split('/')[1]}`), 
      { type: compressedBlob.type, lastModified: Date.now() }
    )
  } catch (error) {
    console.error('Error compressing image:', error)
    // Fallback to the original file if compression fails
    return file
  }
}
