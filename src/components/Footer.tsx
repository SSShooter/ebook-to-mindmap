export function Footer() {
  return (
    <div>
      <p className="text-sidebar-foreground/60 text-center py-4 text-sm">
        Mindmap Powered by{' '}
        <a
          href="https://mind-elixir.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block align-bottom">
          <img
            src="/mind-elixir-desktop-logo.svg"
            alt="MindElixir"
            className="w-10 inline-block"
          />
        </a>
      </p>
    </div>
  )
}
