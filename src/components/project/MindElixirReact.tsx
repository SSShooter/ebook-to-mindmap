import type { MindElixirData, MindElixirInstance, Options } from "mind-elixir"
import MindElixir from "mind-elixir"
import "mind-elixir/style.css"
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from "react"

interface MindElixirReactProps {
  data: MindElixirData
  options?: Partial<Options>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins?: any[]
  initScale?: number
  className?: string
  fitPage?: boolean
}

export interface MindElixirReactRef {
  instance: MindElixirInstance | null
}

const MindElixirReact = forwardRef<MindElixirReactRef, MindElixirReactProps>(
  ({ data, options, plugins, initScale, className, fitPage }, ref) => {
    const mindmapEl = useRef<HTMLDivElement>(null)
    const meInstance = useRef<MindElixirInstance | null>(null)
    const isInitialized = useRef<boolean>(false)
    const [dataHash, setDataHash] = useState<string>("")

    useImperativeHandle(ref, () => ({
      instance: meInstance.current
    }))

    const sanitizeNodeData = (nodeData: MindElixirData["nodeData"]) => {
      if (!nodeData) return
      if (nodeData.children) {
        for (const child of nodeData.children) {
          sanitizeNodeData(child)
        }
      }
    }

    // 计算数据的简单哈希值，用于比较数据是否变化
    useEffect(() => {
      if (data) {
        // 使用简单的字符串化方法创建哈希
        // 注意：这不是真正的哈希，只是一种简单的比较方法
        const hash =
          JSON.stringify(data.nodeData.id) +
          JSON.stringify(data.nodeData.topic) +
          (data.nodeData.children?.length || 0)
        setDataHash(hash)
      }
    }, [data])

    // Load MindElixir dynamically and initialize
    useEffect(() => {
      if (!mindmapEl.current || typeof window === "undefined") return

      const initializeMindElixir = async () => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
        const changeTheme = (e: MediaQueryListEvent) => {
          if (e.matches) {
            meInstance.current?.changeTheme(MindElixir.DARK_THEME)
          } else {
            meInstance.current?.changeTheme(MindElixir.THEME)
          }
        }

        const mergedOptions = {
          ...(options || {}),
          el: mindmapEl.current!
        }

        meInstance.current = new MindElixir(mergedOptions)

        // Install plugins
        if (plugins) {
          for (const plugin of plugins) {
            meInstance.current?.install(plugin)
          }
        }

        // Set initial scale
        if (initScale && meInstance.current) {
          meInstance.current.scaleVal = initScale
          meInstance.current.map.style.transform = `scale(${initScale})`
        }

        if (meInstance.current) {
          meInstance.current.map.style.opacity = "0"
        }

        mediaQuery.addEventListener("change", changeTheme)
        isInitialized.current = true

        // Initialize with data if available
        if (data && meInstance.current) {
          sanitizeNodeData(data.nodeData)
          meInstance.current.init(data)
          meInstance.current.toCenter()
          meInstance.current.scale(0.5)
          fitPage && meInstance.current.scaleFit()
          meInstance.current.map.style.opacity = "1"
        }

        // Return cleanup function
        return () => {
          mediaQuery.removeEventListener("change", changeTheme)
        }
      }

      let cleanup: (() => void) | undefined
      initializeMindElixir().then((cleanupFn) => {
        cleanup = cleanupFn
      })

      return () => {
        cleanup?.()
      }
    }, [options, plugins, initScale])

    // 使用dataHash作为依赖项，只有当数据真正变化时才刷新
    useEffect(() => {
      if (!data || !meInstance.current || !isInitialized.current || !dataHash)
        return

      sanitizeNodeData(data.nodeData)
      meInstance.current.refresh(data)
      meInstance.current.toCenter()
      fitPage && meInstance.current.scaleFit()
      meInstance.current.map.style.opacity = "1"
    }, [dataHash, fitPage])

    return (
      <div
        ref={mindmapEl}
        className={className}
        onWheelCapture={
          e => { if (!e.ctrlKey) e.stopPropagation() }
        }
      />
    )
  }
)

MindElixirReact.displayName = "MindElixirReact"

export default MindElixirReact
