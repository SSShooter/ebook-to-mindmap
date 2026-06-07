// Prompt工具函数

/**
 * 获取语言指令
 * @param language 输出语言
 * @returns 对应语言的指令文本
 */
export const getLanguageInstruction = (
  language: 'en' | 'zh' | 'ja' | 'fr' | 'de' | 'es' | 'ru' = 'en'
): string => {
  const languageNames: Record<string, string> = {
    zh: 'Simplified Chinese (简体中文)',
    en: 'English',
    ja: 'Japanese',
    fr: 'French',
    de: 'German',
    es: 'Spanish',
    ru: 'Russian',
  }

  const targetName = languageNames[language] || languageNames.en

  return `[Important Language Requirement]
You must reply and generate all content strictly in [${targetName}].
Please strictly adhere to the following rules:
1. All summary text, section/paragraph titles, mindmap node topics (Topic), connection labels (Label), relationship analyses, character relationships, etc., must be outputted entirely in [${targetName}].
2. Even if the original book/chapter content is in another language, you must translate it and summarize/generate content in [${targetName}].
3. Translate any hardcoded structural terms in the prompt into the corresponding [${targetName}] (e.g., translate structural node names like "金句" or "核心" to the corresponding target language terms; do not keep any Chinese structural terms in the output).`
}


/**
 * 语言类型定义
 */
export type SupportedLanguage =
  | 'en'
  | 'zh'
  | 'ja'
  | 'fr'
  | 'de'
  | 'es'
  | 'ru'
