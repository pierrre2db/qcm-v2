// Lightweight Markdown renderer — no external deps.
// Inline: **bold**, *italic*, \n → <br>
// Block (MdBlock): + bullet lists (- item), paragraphs

function renderInline(text, keyPrefix = '') {
  const parts = String(text).split(/(\*\*[\s\S]+?\*\*|\*[\s\S]+?\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={keyPrefix + i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*')) return <em key={keyPrefix + i}>{part.slice(1, -1)}</em>
    return part || null
  })
}

export function Md({ children, className }) {
  if (!children) return null
  const lines = String(children).split('\n')
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span key={i}>
          {renderInline(line, `${i}-`)}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </span>
  )
}

export function MdBlock({ children, className }) {
  if (!children) return null
  const lines = String(children).split('\n')

  const blocks = []
  let currentList = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isBullet = /^[-•]\s/.test(line)
    if (isBullet) {
      if (!currentList) { currentList = []; blocks.push({ type: 'ul', items: currentList }) }
      currentList.push(line.replace(/^[-•]\s/, ''))
    } else if (line.trim() === '') {
      currentList = null
    } else {
      currentList = null
      blocks.push({ type: 'p', text: line })
    }
  }

  return (
    <div className={className}>
      {blocks.map((block, i) => {
        if (block.type === 'ul') {
          return (
            <ul key={i} className="list-disc list-inside space-y-0.5 my-1">
              {block.items.map((item, j) => <li key={j}>{renderInline(item, `${i}-${j}-`)}</li>)}
            </ul>
          )
        }
        return <p key={i} className="mb-1 last:mb-0">{renderInline(block.text, `${i}-`)}</p>
      })}
    </div>
  )
}
