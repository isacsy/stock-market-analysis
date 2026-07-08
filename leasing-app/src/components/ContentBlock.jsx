import renderBold from '../utils/renderBold'

// Renders one teaching-card content block. The `type` field in
// data/content.js selects the variant.
export default function ContentBlock({ block }) {
  switch (block.type) {
    case 'text':
      return <p className="text-[15px] leading-relaxed text-ink">{renderBold(block.text)}</p>

    case 'chips':
      return (
        <div className="flex flex-wrap gap-2">
          {block.items.map((item, i) => (
            <span
              key={i}
              className="bg-teal-tint text-teal font-bold text-sm px-3.5 py-1.5 rounded-full"
            >
              {item}
            </span>
          ))}
        </div>
      )

    case 'comparison':
      return (
        <div className="rounded-2xl overflow-hidden border-2 border-teal-tint">
          <div className="grid grid-cols-2">
            <div className="bg-teal text-white font-extrabold text-sm text-center py-2 px-2">
              {block.leftTitle}
            </div>
            <div className="bg-coral text-white font-extrabold text-sm text-center py-2 px-2">
              {block.rightTitle}
            </div>
          </div>
          {block.rows.map((row, i) => (
            <div key={i} className="grid grid-cols-2 border-t border-teal-tint">
              <div className="text-sm text-ink px-3 py-2.5 border-r border-teal-tint">{row[0]}</div>
              <div className="text-sm text-ink px-3 py-2.5">{row[1]}</div>
            </div>
          ))}
        </div>
      )

    case 'feature': {
      const isCoral = block.color === 'coral'
      return (
        <div
          className={`rounded-2xl p-4 border-2 ${
            isCoral ? 'bg-coral/10 border-coral/30' : 'bg-teal-tint border-teal/30'
          }`}
        >
          <p className={`font-black text-base mb-1 ${isCoral ? 'text-coral' : 'text-teal'}`}>
            {block.heading}
          </p>
          <p className="text-sm text-ink leading-relaxed">{renderBold(block.text)}</p>
        </div>
      )
    }

    case 'formula':
      return (
        <pre className="bg-ink text-teal-tint rounded-2xl p-4 text-[13px] leading-relaxed font-mono overflow-x-auto whitespace-pre">
          {block.lines.join('\n')}
        </pre>
      )

    case 'steps':
      return (
        <ol className="flex flex-col gap-2.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-teal text-white text-xs font-black flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-[15px] text-ink leading-relaxed">{renderBold(item)}</span>
            </li>
          ))}
        </ol>
      )

    case 'tip':
      return (
        <div className="rounded-2xl p-4 bg-gold/10 border-2 border-gold/40 flex gap-3">
          <span className="text-xl shrink-0">💡</span>
          <div>
            {block.label && (
              <p className="text-xs font-black uppercase tracking-wide text-gold mb-1">{block.label}</p>
            )}
            <p className="text-sm text-ink leading-relaxed">{renderBold(block.text)}</p>
          </div>
        </div>
      )

    default:
      return null
  }
}
