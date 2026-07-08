// Displays remaining hearts out of a max, with a little pop animation on loss.
export default function Hearts({ hearts, max = 3 }) {
  return (
    <div className="flex gap-1 text-lg leading-none" aria-label={`${hearts} of ${max} hearts remaining`}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={i < hearts ? 'animate-pop-in' : 'opacity-25 grayscale'}>
          ❤️
        </span>
      ))}
    </div>
  )
}
