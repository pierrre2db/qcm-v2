// ── CLOUDINARY UNSIGNED UPLOAD ────────────────────────────────────────────────
// Config via .env.local :
//   VITE_CLOUDINARY_CLOUD=ton-cloud-name
//   VITE_CLOUDINARY_PRESET=qcm_upload

const CLOUD  = import.meta.env.VITE_CLOUDINARY_CLOUD  ?? ''
const PRESET = import.meta.env.VITE_CLOUDINARY_PRESET ?? ''

export const cloudinaryConfigured = Boolean(CLOUD && PRESET)

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const MAX_PX    = 1200                   // max width OR height for raster
const QUALITY   = 0.85                   // WebP quality (canvas output)
const MAX_BYTES = 10 * 1024 * 1024      // 10 MB input limit

// ── RASTER OPTIMISATION (canvas → WebP blob) ─────────────────────────────────
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
      ctx.fillStyle = '#ffffff'      // white bg for transparent PNGs
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
        'image/webp',
        QUALITY
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Impossible de lire l\'image')) }
    img.src = url
  })
}

// ── PUBLIC: optimise + upload to Cloudinary ───────────────────────────────────
// onProgress(0-100) called during XHR upload
// Returns: Promise<string> — Cloudinary secure_url (https, CDN, permanent)
export async function uploadQuizImage(file, _questionKey, onProgress = () => {}) {
  if (!cloudinaryConfigured) {
    throw new Error('Cloudinary non configuré — ajoute VITE_CLOUDINARY_CLOUD et VITE_CLOUDINARY_PRESET dans .env.local')
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`Image trop lourde (max 10 Mo, reçu ${(file.size / 1024 / 1024).toFixed(1)} Mo)`)
  }

  const isSvg = file.type === 'image/svg+xml'
  // SVG → upload as-is (vector, lossless)
  // Raster → resize + WebP conversion
  const blob = isSvg ? file : await optimizeRaster(file)

  const form = new FormData()
  form.append('file', blob, isSvg ? 'image.svg' : 'image.webp')
  form.append('upload_preset', PRESET)
  form.append('folder', 'quiz-images')

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', endpoint)

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText)
          resolve(data.secure_url)
        } catch {
          reject(new Error('Réponse Cloudinary invalide'))
        }
      } else {
        let msg = `Erreur Cloudinary (${xhr.status})`
        try {
          const err = JSON.parse(xhr.responseText)
          if (err.error?.message) msg = err.error.message
        } catch {}
        reject(new Error(msg))
      }
    }

    xhr.onerror = () => reject(new Error('Erreur réseau — vérifiez votre connexion'))
    xhr.send(form)
  })
}

// ── ACCEPTED FORMATS ──────────────────────────────────────────────────────────
export const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml'
export const ACCEPTED_IMAGE_LABEL = 'JPG · PNG · WebP · GIF · SVG — max 10 Mo'
