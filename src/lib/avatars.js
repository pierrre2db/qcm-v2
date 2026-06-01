export const AVATAR_STYLES = [
  { id: 'bottts-neutral', label: 'Robot',   emoji: '🤖' },
  { id: 'fun-emoji',      label: 'Emoji',   emoji: '😄' },
  { id: 'pixel-art-neutral', label: 'Pixel', emoji: '🎮' },
]

export const DEFAULT_STYLE = 'bottts-neutral'

export function getAvatarUrl(name, style) {
  const s = style || DEFAULT_STYLE
  const seed = encodeURIComponent((name || 'player').trim())
  return `https://api.dicebear.com/10.x/${s}/svg?seed=${seed}&size=80`
}

export function getInitials(name) {
  const clean = (name || '?').trim()
  const words = clean.split(/[\s\-_]+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return clean.slice(0, 2).toUpperCase()
}

export function loadSavedStyle() {
  try { return localStorage.getItem('qcm_avatar_style') || DEFAULT_STYLE } catch { return DEFAULT_STYLE }
}

export function saveStyle(style) {
  try { localStorage.setItem('qcm_avatar_style', style) } catch {}
}
