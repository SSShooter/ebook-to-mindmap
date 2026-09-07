import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = path.resolve(__dirname, '../src/config/models-dev-providers.json')

/**
 * models.dev 中部分第一方供应商使用 Vercel AI SDK 专用包（@ai-sdk/openai 等），
 * provider.toml 里没有显式写 api 字段。本项目统一走 OpenAI 兼容协议
 * （${baseUrl}/chat/completions、${baseUrl}/models），需要为它们补上兼容 Base URL。
 */
const KNOWN_API_BASE_URLS = {
  openai: 'https://api.openai.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta/openai',
  groq: 'https://api.groq.com/openai/v1',
  mistral: 'https://api.mistral.ai/v1',
  perplexity: 'https://api.perplexity.ai',
  togetherai: 'https://api.together.xyz/v1',
  xai: 'https://api.x.ai/v1',
  deepinfra: 'https://api.deepinfra.com/v1/openai',
  cerebras: 'https://api.cerebras.ai/v1',
  venice: 'https://api.venice.ai/api/v1',
  aihubmix: 'https://aihubmix.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  siliconflow: 'https://api.siliconflow.cn/v1',
}

/**
 * 与内置供应商重复的条目，避免下拉框出现两个同款。
 * 内置只保留 openai / openai-responses / tokendance，
 * openrouter、302ai、google 等其余供应商一律从 models.dev 同步。
 */
const SKIP_IDS = new Set(['openai'])

/** 内置供应商已占用的 Base URL，同 URL 的 models.dev 条目同样跳过 */
const SKIP_API_URLS = new Set(['https://tokendance.space/gateway/v1'])

const normalize = (url) => String(url || '').trim().replace(/\/+$/, '').toLowerCase()

async function syncProviders() {
  console.log('Fetching providers from https://models.dev/api.json...')
  const res = await fetch('https://models.dev/api.json')
  if (!res.ok) {
    throw new Error(`Failed to fetch models.dev: ${res.status} ${res.statusText}`)
  }

  const raw = await res.json()
  const providers = Object.entries(raw)
    .filter(([id]) => !SKIP_IDS.has(id))
    .map(([id, p]) => {
      let api = p.api ? String(p.api).replace(/\/+$/, '') : undefined
      if (!api && KNOWN_API_BASE_URLS[id]) {
        api = KNOWN_API_BASE_URLS[id]
      }
      return {
        id,
        name: p.name || id,
        api,
        doc: p.doc,
        npm: p.npm,
        env: p.env,
      }
    })
    .filter((p) => !p.api || !SKIP_API_URLS.has(normalize(p.api)))
    // 本应用统一走 OpenAI 兼容协议，无兼容 Base URL 的供应商（Bedrock/Azure/Vertex 等
    // SDK 专用渠道）无法使用，直接过滤
    .filter((p) => !!p.api)

  // 按名称字母升序排列
  providers.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(providers, null, 2) + '\n', 'utf8')
  console.log(`Successfully synced ${providers.length} providers to ${OUTPUT_PATH}`)
}

syncProviders().catch((err) => {
  console.error('Error syncing providers:', err)
  process.exit(1)
})
