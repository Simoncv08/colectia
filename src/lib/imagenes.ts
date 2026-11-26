import sharp from 'sharp'
import { LADO_MAXIMO_IMAGEN, MAX_BYTES_IMAGEN } from '@/lib/limitesImagen'

const MAX_PIXELES = 50_000_000

const FIRMAS: { tipo: string; coincide: (b: Buffer) => boolean }[] = [
  { tipo: 'jpeg', coincide: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { tipo: 'png', coincide: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { tipo: 'webp', coincide: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  { tipo: 'gif', coincide: (b) => ['GIF87a', 'GIF89a'].includes(b.toString('ascii', 0, 6)) },
]

// El tipo real según los primeros bytes; el nombre y el tipo que declara el navegador no cuentan.
export function tipoRealDeImagen(contenido: Buffer): string | null {
  return FIRMAS.find((f) => contenido.length >= 12 && f.coincide(contenido))?.tipo ?? null
}

// Abre la imagen y la vuelve a dibujar desde cero como WebP: lo que no sea imagen (scripts,
// archivos pegados al final, metadatos como la ubicación GPS) no pasa al archivo nuevo.
export async function limpiarImagen(archivo: File): Promise<Buffer> {
  if (archivo.size === 0) throw new Error('Elige una imagen.')
  if (archivo.size > MAX_BYTES_IMAGEN) throw new Error('La imagen es demasiado pesada. Elige otra.')

  const original = Buffer.from(await archivo.arrayBuffer())
  if (!tipoRealDeImagen(original)) {
    throw new Error('Ese archivo no es una imagen JPG, PNG, WEBP o GIF.')
  }

  try {
    return await sharp(original, { failOn: 'error', limitInputPixels: MAX_PIXELES })
      .rotate()
      .resize({ width: LADO_MAXIMO_IMAGEN, height: LADO_MAXIMO_IMAGEN, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
  } catch {
    throw new Error('No se pudo leer la imagen: puede estar dañada. Prueba con otra.')
  }
}
