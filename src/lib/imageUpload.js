import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { app, isFirebaseConfigured } from './firebase'

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const MAX_PX    = 1200   // max width OR height for raster
const QUALITY   = 0.85   // WebP quality
const MAX_BYTES = 10 * 1024 * 1024  // 10 MB input limit

// ── RASTER OPTIMISATION (canvas → WebP) ──────────────────────────────────────
function optimizeRaster(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { naturalWidth: w, naturalHeight: h } = img
      if (w > MAX_PX || h > MAX_PX) {
        const ratio = Math.min(MAX_PX / w, MAX_PX / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      // White background for transparent PNGs
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
        'image/webp',
        QUALITY
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}

// ── PUBLIC: optimise + upload ─────────────────────────────────────────────────
// onProgress(0-100) called during upload
// Returns: Promise<string> — Firebase download URL
export async function uploadQuizImage(file, questionKey, onProgress = () => {}) {
  if (!isFirebaseConfigured) throw new Error('Firebase non configuré')
  if (file.size > MAX_BYTES) throw new Error(`Image trop lourde (max 10 Mo, reçu ${(file.size/1024/1024).toFixed(1)} Mo)`)

  const isSvg = file.type === 'image/svg+xml'
  const blob  = isSvg ? file : await optimizeRaster(file)
  const ext   = isSvg ? 'svg' : 'webp'
  const path  = `quiz-images/${questionKey}_${Date.now()}.${ext}`

  const storage     = getStorage(app)
  const storageRef  = ref(storage, path)
  const uploadTask  = uploadBytesResumable(storageRef, blob, {
    contentType: isSvg ? 'image/svg+xml' : 'image/webp',
    cacheControl: 'public,max-age=31536000'
  })

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      snap => onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => {
        try { resolve(await getDownloadURL(uploadTask.snapshot.ref)) }
        catch (e) { reject(e) }
      }
    )
  })
}

// ── ACCEPTED FORMATS (for <input accept="..."> and validation) ────────────────
export const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml'
export const ACCEPTED_IMAGE_LABEL = 'JPG, PNG, WebP, GIF, SVG — max 10 Mo'
