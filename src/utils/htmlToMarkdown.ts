/**
 * Simple HTML to Markdown converter
 * Converts basic HTML tags to Markdown syntax
 */
export function htmlToMarkdown(html: string): string {
    if (!html) return ''

    // Create a temporary DOM element to parse HTML
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const body = doc.body

    // Helper function to process nodes recursively
    function processNode(node: Node): string {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent || ''
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return ''
        }

        const element = node as Element
        const tagName = element.tagName.toLowerCase()
        let content = ''

        // Process child nodes
        element.childNodes.forEach(child => {
            content += processNode(child)
        })

        // Handle specific tags
        switch (tagName) {
            case 'h1':
                return `\n# ${content.trim()}\n\n`
            case 'h2':
                return `\n## ${content.trim()}\n\n`
            case 'h3':
                return `\n### ${content.trim()}\n\n`
            case 'h4':
                return `\n#### ${content.trim()}\n\n`
            case 'h5':
                return `\n##### ${content.trim()}\n\n`
            case 'h6':
                return `\n###### ${content.trim()}\n\n`
            case 'p':
            case 'div':
                // Only add newlines if there is content
                return content.trim() ? `\n${content.trim()}\n\n` : ''
            case 'br':
                return '\n'
            case 'hr':
                return '\n---\n\n'
            case 'strong':
            case 'b':
                return content.trim() ? ` **${content.trim()}** ` : ''
            case 'em':
            case 'i':
                return content.trim() ? ` *${content.trim()}* ` : ''
            case 'ul':
                return `\n${content}\n`
            case 'ol':
                return `\n${content}\n`
            case 'li':
                // For list items, we need to handle indentation if nested (simplified here)
                // Check parent to decide if it's ordered or unordered (simplified)
                const parentTag = element.parentElement?.tagName.toLowerCase()
                const prefix = parentTag === 'ol' ? '1. ' : '- '
                return `${prefix}${content.trim()}\n`
            case 'blockquote':
                return `\n> ${content.trim().replace(/\n/g, '\n> ')}\n\n`
            case 'code':
                return ` \`${content}\` `
            case 'pre':
                return `\n\`\`\`\n${content}\n\`\`\`\n\n`
            case 'a':
                const href = element.getAttribute('href')
                return href ? `[${content}](${href})` : content
            case 'img':
                const src = element.getAttribute('src')
                const alt = element.getAttribute('alt') || ''
                return src ? `![${alt}](${src})` : ''
            case 'script':
            case 'style':
            case 'meta':
            case 'link':
                return '' // Ignore these tags
            default:
                return content
        }
    }

    // Initial cleanup of the DOM if needed
    // (The recursive function handles script/style removal by ignoring them)

    let markdown = processNode(body)

    // Post-processing to clean up excessive newlines
    markdown = markdown
        .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
        .trim()

    return markdown
}
