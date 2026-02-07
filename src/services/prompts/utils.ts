// Prompt工具函数

/**
 * 获取语言指令
 * @param language 输出语言
 * @returns 对应语言的指令文本
 */
export const getLanguageInstruction = (
  language: 'en' | 'zh' | 'ja' | 'fr' | 'de' | 'es' | 'ru' | 'auto' = 'en'
): string => {
  switch (language) {
    case 'zh':
      return '请用中文回复。'
    case 'ja':
      return '日本語で回答してください。'
    case 'fr':
      return 'Veuillez répondre en français.'
    case 'de':
      return 'Bitte antworten Sie auf Deutsch.'
    case 'es':
      return 'Por favor responda en español.'
    case 'ru':
      return 'Пожалуйста, отвечайте на русском языке.'
    case 'en':
    case 'auto':
    default:
      return 'Please respond in English.'
  }
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
  | 'auto'
