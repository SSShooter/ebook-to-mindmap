import localforage from 'localforage'

export interface VoyResource {
  embeddings: Array<{
    id: string
    title: string
    url: string
    embeddings: number[]
  }>
}

export interface VoySearchResult {
  neighbors: Array<{
    id: string
    title?: string
    url?: string
  }>
}

export interface VoyInstance {
  search(query: Float32Array, k: number): VoySearchResult
}

// We need to dynamically import Voy because it uses WebAssembly
let VoyClass: (new (resource: VoyResource) => VoyInstance) | null = null

export interface Chunk {
  id: string
  chapterId: string
  chapterTitle: string
  text: string
}

export interface EmbeddedChunk extends Chunk {
  embeddings: number[]
}

export class RagService {
  private voyInstance: VoyInstance | null = null
  private bookId: string = ''
  private embeddingsStore: LocalForage

  constructor() {
    this.embeddingsStore = localforage.createInstance({
      name: 'ebook-mindmap-rag',
      storeName: 'embeddings',
    })
  }

  // Load the Voy WebAssembly module
  private async ensureVoyLoaded() {
    if (!VoyClass) {
      const VoyModule = await import('voy-search')
      VoyClass = VoyModule.Voy
    }
  }

  // Set the current book being processed or queried
  public setBook(bookId: string) {
    this.bookId = bookId
  }

  // Split text into chunks using sliding window
  public chunkText(
    text: string,
    chapterId: string,
    chapterTitle: string,
    chunkSize = 1000,
    overlap = 200
  ): Chunk[] {
    const chunks: Chunk[] = []
    let i = 0
    let chunkIndex = 0

    while (i < text.length) {
      const end = Math.min(i + chunkSize, text.length)
      const chunkText = text.slice(i, end)

      chunks.push({
        id: `${chapterId}-${chunkIndex}`,
        chapterId,
        chapterTitle,
        text: chunkText,
      })

      i += chunkSize - overlap
      chunkIndex++
    }

    return chunks
  }

  // Call OpenRouter 's embedding API
  public async getEmbeddings(
    texts: string[],
    apiKey: string,
    model: string
  ): Promise<number[][]> {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: texts,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Failed to fetch embeddings: ${response.status} ${err}`)
    }

    const data = await response.json()
    // OpenRouter returns { data: [{ embedding: [...] }, ...] }
    return data.data.map((item: { embedding: number[] }) => item.embedding)
  }

  // Process and index an entire book's chunks
  public async buildIndex(
    chunks: Chunk[],
    apiKey: string,
    model: string,
    onProgress?: (progress: number, total: number) => void
  ) {
    if (!this.bookId) throw new Error('Book ID not set')

    await this.ensureVoyLoaded()

    // Process in batches to avoid payload too large
    const BATCH_SIZE = 10
    const allEmbeddedChunks: EmbeddedChunk[] = []

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const texts = batch.map((c) => c.text)

      const embeddings = await this.getEmbeddings(texts, apiKey, model)

      for (let j = 0; j < batch.length; j++) {
        allEmbeddedChunks.push({
          ...batch[j],
          embeddings: embeddings[j],
        })
      }

      if (onProgress) {
        onProgress(Math.min(i + BATCH_SIZE, chunks.length), chunks.length)
      }
    }

    // Save to IndexedDB
    await this.embeddingsStore.setItem(this.bookId, allEmbeddedChunks)

    // Initialize Voy Index
    this.createVoyIndex(allEmbeddedChunks)
  }

  // Create or Re-Initialize the Voy index from chunks
  private createVoyIndex(embeddedChunks: EmbeddedChunk[]) {
    // Voy requires data in a specific Resource format
    const resource = {
      embeddings: embeddedChunks.map((chunk) => ({
        id: chunk.id,
        title: chunk.chapterTitle,
        url: chunk.chapterId, // store chapterId in url
        embeddings: chunk.embeddings,
      })),
    }

    // Create new Voy instance
    if (!VoyClass) throw new Error('VoyClass is not loaded')
    this.voyInstance = new VoyClass(resource)
  }

  // Load an existing index from IndexedDB for querying
  public async loadIndex(): Promise<boolean> {
    if (!this.bookId) throw new Error('Book ID not set')

    const storedData = await this.embeddingsStore.getItem<EmbeddedChunk[]>(
      this.bookId
    )
    if (!storedData || storedData.length === 0) {
      return false
    }

    await this.ensureVoyLoaded()
    this.createVoyIndex(storedData)
    return true
  }

  // Clear existing index for current book
  public async clearIndex() {
    if (!this.bookId) throw new Error('Book ID not set')
    await this.embeddingsStore.removeItem(this.bookId)
    this.voyInstance = null
  }

  // Search for the most relevant chunks
  public async search(
    query: string,
    apiKey: string,
    model: string,
    k: number = 5
  ): Promise<EmbeddedChunk[]> {
    if (!this.voyInstance) {
      const loaded = await this.loadIndex()
      if (!loaded)
        throw new Error('Index not found for this book. Please index it first.')
    }

    // Get embedding for the query
    const [queryEmbedding] = await this.getEmbeddings([query], apiKey, model)

    // Voy expects a Float32Array for the query
    const queryArray = new Float32Array(queryEmbedding)

    if (!this.voyInstance) {
      throw new Error('Voy index is not properly initialized.')
    }

    // Search
    const results = this.voyInstance.search(queryArray, k)

    // We only get IDs back in neighbors, so we need to map them back to full chunks
    const storedData = await this.embeddingsStore.getItem<EmbeddedChunk[]>(
      this.bookId
    )
    if (!storedData) return []

    const retrievedChunks: EmbeddedChunk[] = []
    for (const neighbor of results.neighbors) {
      const chunk = storedData.find((c: EmbeddedChunk) => c.id === neighbor.id)
      if (chunk) {
        retrievedChunks.push(chunk)
      }
    }

    return retrievedChunks
  }

  // Generate an answer using the LLM with retrieved context
  public async askQuestionStream(
    query: string,
    contextChunks: EmbeddedChunk[],
    apiKey: string,
    // we should use a chat model here, separate from embedding, maybe from regular config
    chatModel: string,
    onUpdate: (text: string) => void
  ): Promise<string> {
    const contextText = contextChunks
      .map((c) => `[Chapter: ${c.chapterTitle}]\n${c.text}`)
      .join('\n\n---\n\n')

    const prompt = `You are a helpful assistant answering questions strictly based on the provided book context.
If the answer is not contained within the context, politely say that you don't know based on the provided text.

Context:
${contextText}

Question:
${query}

Answer:`

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: chatModel,
          messages: [{ role: 'user', content: prompt }],
          stream: true,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`LLM Error: ${response.status} ${await response.text()}`)
    }

    if (!response.body) throw new Error('No body in response')

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let fullText = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') continue

        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6))
            const chunk = data.choices[0]?.delta?.content || ''
            if (chunk) {
              fullText += chunk
              onUpdate(chunk)
            }
          } catch {
            console.warn('Failed to parse SSE line', trimmed)
          }
        }
      }
    }

    return fullText
  }
}
