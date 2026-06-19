import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { X, Check } from 'lucide-react'

export interface Point {
  x: number
  y: number
}

export interface Area {
  width: number
  height: number
  x: number
  y: number
}

interface ImageCropperProps {
  imageSrc: string
  onCropDone: (croppedImage: Blob) => void
  onCancel: () => void
}

/**
 * Creates a canvas, draws the image onto it according to the crop pixel area,
 * and extracts it as a Blob.
 */
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (error) => reject(error)
    img.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  // We set the canvas to the requested cropped size
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  // Draw the section of the image we want to keep
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'))
        return
      }
      resolve(blob)
    }, 'image/webp', 0.9)
  })
}

export default function ImageCropper({ imageSrc, onCropDone, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspect, setAspect] = useState<number>(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [cropping, setCropping] = useState(false)

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleCrop = async () => {
    if (!croppedAreaPixels) return
    setCropping(true)
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
      onCropDone(croppedBlob)
    } catch (e) {
      console.error(e)
    } finally {
      setCropping(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Crop Image</h2>
          <button 
            type="button" 
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Cropper Container */}
        <div className="relative w-full h-[50vh] sm:h-[60vh] bg-gray-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        {/* Controls */}
        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto w-full sm:w-auto">
              {[
                { label: 'Square', value: 1 },
                { label: '4:3', value: 4/3 },
                { label: '3:4', value: 3/4 },
                { label: '16:9', value: 16/9 },
              ].map(a => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => setAspect(a.value)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${aspect === a.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
                >
                  {a.label}
                </button>
              ))}
            </div>

            <div className="flex-1 flex items-center gap-4 sm:max-w-xs w-full">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Zoom</span>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-brand-400"
              />
            </div>
          </div>
          
          <div className="flex gap-2 w-full justify-end border-t border-gray-100 pt-4 mt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 font-semibold text-sm transition-colors"
            >
              Skip Crop
            </button>
            <button
              type="button"
              onClick={handleCrop}
              disabled={cropping}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-brand-400 hover:bg-brand-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {cropping ? 'Cropping...' : <><Check size={16} /> Save Crop</>}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
