import sharp from 'sharp'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(here, '..', 'public')

const sourceSvg = await readFile(path.join(publicDir, 'icon-previews', 'option-c-bag.svg'))

const targets = [
  { name: 'favicon-32.png', size: 32 },
  { name: 'favicon-16.png', size: 16 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
]

await mkdir(publicDir, { recursive: true })

for (const { name, size } of targets) {
  const out = path.join(publicDir, name)
  await sharp(sourceSvg, { density: 384 })
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(out)
  console.log(`wrote ${name} (${size}x${size})`)
}

await writeFile(path.join(publicDir, 'favicon.svg'), sourceSvg)
console.log('wrote favicon.svg (copied from option-c-bag.svg)')
