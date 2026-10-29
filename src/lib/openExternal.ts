/**
 * 在外部浏览器中打开链接：
 * - Tauri 桌面端走 opener 插件，用系统默认浏览器打开
 * - 网页版回退到 window.open
 */
export async function openExternalUrl(url: string): Promise<void> {
  try {
    const { isTauri } = await import('@tauri-apps/api/core')
    if (isTauri()) {
      const { openUrl } = await import('@tauri-apps/plugin-opener')
      await openUrl(url)
      return
    }
  } catch {
    // 非 Tauri 环境或插件不可用时回退到浏览器打开
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}
