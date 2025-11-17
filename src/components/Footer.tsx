export function Footer() {
  return (
    <div className="border-t bg-white/50 backdrop-blur-sm">
      <p className="text-gray-600 text-center py-4 text-sm">
        Mindmap powered by{' '}
        <a
          href="https://mind-elixir.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          MindElixir
        </a>
      </p>
    </div>
  )
}
