// Turns "**bold**" markdown-style spans into <strong> elements. Used by any
// content block that renders text authored in data/content.js.
export default function renderBold(text) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="text-ink font-extrabold">{part}</strong> : part,
  )
}
