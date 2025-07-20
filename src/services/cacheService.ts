export class CacheService {
  private cache: Map<string, any>
  private readonly STORAGE_KEY = 'epub-processor-cache'
  private readonly MAX_CACHE_SIZE = 999 // 最大缓存条目数
  private readonly CACHE_EXPIRY = 999 * 24 * 60 * 60 * 1000

  constructor() {
    this.cache = new Map()
    this.loadFromLocalStorage()
  }

  // 从localStorage加载缓存
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        const now = Date.now()
        
        // 过滤过期的缓存项
        Object.entries(data).forEach(([key, value]: [string, any]) => {
          if (value.timestamp && (now - value.timestamp) < this.CACHE_EXPIRY) {
            this.cache.set(key, value.data)
          }
        })
      }
    } catch (error) {
      console.warn('加载缓存失败:', error)
      // 清除损坏的缓存
      localStorage.removeItem(this.STORAGE_KEY)
    }
  }

  // 保存缓存到localStorage
  private saveToLocalStorage(): void {
    try {
      const data: Record<string, any> = {}
      const now = Date.now()
      
      this.cache.forEach((value, key) => {
        data[key] = {
          data: value,
          timestamp: now
        }
      })
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.warn('保存缓存失败:', error)
    }
  }

  // 获取缓存值
  get(key: string): any {
    return this.cache.get(key)
  }

  // 设置缓存值
  set(key: string, value: any): void {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
    
    this.cache.set(key, value)
    this.saveToLocalStorage()
  }

  // 检查是否存在缓存
  has(key: string): boolean {
    return this.cache.has(key)
  }

  // 删除特定缓存
  delete(key: string): boolean {
    const result = this.cache.delete(key)
    if (result) {
      this.saveToLocalStorage()
    }
    return result
  }

  // 清除所有缓存
  clear(): void {
    this.cache.clear()
    localStorage.removeItem(this.STORAGE_KEY)
  }

  // 获取缓存统计信息
  getStats(): { size: number; maxSize: number; keys: string[] } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      keys: Array.from(this.cache.keys())
    }
  }

  // 清理过期缓存
  cleanup(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        const now = Date.now()
        const validData: Record<string, any> = {}
        
        Object.entries(data).forEach(([key, value]: [string, any]) => {
          if (value.timestamp && (now - value.timestamp) < this.CACHE_EXPIRY) {
            validData[key] = value
          }
        })
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validData))
        
        // 重新加载缓存
        this.cache.clear()
        this.loadFromLocalStorage()
      }
    } catch (error) {
      console.warn('清理缓存失败:', error)
    }
  }

  // 生成缓存键
  static generateKey(filename: string, chapterId: string, version: string = 'v1'): string {
    // 使用简单的哈希函数生成唯一键
    const input = `${filename}_${chapterId}_${version}`
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return `cache_${Math.abs(hash).toString(36)}`
  }

  // 批量设置缓存
  setBatch(entries: Array<{ key: string; value: any }>): void {
    entries.forEach(({ key, value }) => {
      this.cache.set(key, value)
    })
    this.saveToLocalStorage()
  }

  // 批量获取缓存
  getBatch(keys: string[]): Map<string, any> {
    const result = new Map()
    keys.forEach(key => {
      if (this.cache.has(key)) {
        result.set(key, this.cache.get(key))
      }
    })
    return result
  }
}