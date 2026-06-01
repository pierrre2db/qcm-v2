const STYLE = 'bottts-neutral'

export function getAvatarUrl(name) {
  const seed = encodeURIComponent((name || 'player').trim())
  return `https://api.dicebear.com/10.x/${STYLE}/svg?seed=${seed}&size=80`
}

export function getInitials(name) {
  const clean = (name || '?').trim()
  const words = clean.split(/[\s\-_]+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return clean.slice(0, 2).toUpperCase()
}
