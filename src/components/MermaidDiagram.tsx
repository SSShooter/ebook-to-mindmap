import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { CopyButton } from '@/components/ui/copy-button'
import { ViewContentDialog } from './ViewContentDialog'
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface MermaidDiagramProps {
    chart: string
    className?: string
    title?: string
    showCopyButton?: boolean
    showViewCode?: boolean
}

// 初始化mermaid配置
mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
})

export function MermaidDiagram({
    chart,
    className = '',
    title = 'Mermaid Diagram',
    showCopyButton = true,
    showViewCode = true
}: MermaidDiagramProps) {
    const { t } = useTranslation()
    const containerRef = useRef<HTMLDivElement>(null)
    const [scale, setScale] = useState(1)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const dragStartRef = useRef({ x: 0, y: 0 })

    const handleZoomIn = () => {
        setScale(prev => Math.min(prev + 0.1, 3))
    }

    const handleZoomOut = () => {
        setScale(prev => Math.max(prev - 0.1, 0.5))
    }

    const handleResetZoom = () => {
        setScale(1)
        setPosition({ x: 0, y: 0 })
    }

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            try {
                if (containerRef.current && containerRef.current.parentElement) {
                    await containerRef.current.parentElement.requestFullscreen()
                }
            } catch (err) {
                console.error('Error attempting to enable fullscreen:', err)
            }
        } else {
            if (document.exitFullscreen) {
                await document.exitFullscreen()
            }
        }
    }

    // 使用原生事件监听器以支持 preventDefault (React合成事件在某些浏览器中可能是passive的)
    useEffect(() => {
        const container = containerRef.current?.parentElement
        if (!container) return

        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault()
                const delta = e.deltaY > 0 ? -0.1 : 0.1
                setScale(prev => Math.min(Math.max(prev + delta, 0.5), 3))
            }
        }

        container.addEventListener('wheel', handleWheel, { passive: false })

        return () => {
            container.removeEventListener('wheel', handleWheel)
        }
    }, [])

    // 监听全屏变化更新状态
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }, [])

    // 监听 F1 键复位
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F1') {
                e.preventDefault()
                handleResetZoom()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true)
        dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return
        setPosition({
            x: e.clientX - dragStartRef.current.x,
            y: e.clientY - dragStartRef.current.y
        })
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    useEffect(() => {
        if (!containerRef.current || !chart) return

        const renderDiagram = async () => {
            try {
                // 生成唯一ID
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`

                // 渲染mermaid图表
                const { svg } = await mermaid.render(id, chart)

                // 更新DOM
                if (containerRef.current) {
                    containerRef.current.innerHTML = svg
                }
            } catch (error) {
                console.error('Mermaid渲染错误:', error)
                if (containerRef.current) {
                    containerRef.current.innerHTML = `
            <div class="text-red-500 p-4 border border-red-300 rounded bg-red-50">
              <p class="font-semibold">渲染失败</p>
              <p class="text-sm mt-2">Mermaid图表渲染出错，请检查图表语法。</p>
              <details class="mt-2">
                <summary class="cursor-pointer text-sm">查看原始代码</summary>
                <pre class="mt-2 text-xs bg-muted p-2 rounded overflow-auto">${chart}</pre>
              </details>
            </div>
          `
                }
            }
        }

        renderDiagram()
    }, [chart])

    return (
        <div
            className={`relative overflow-hidden border rounded-lg bg-card transition-all duration-300 ${isFullscreen ? 'flex items-center justify-center bg-card' : ''
                }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
            {/* 缩放控制按钮 - 左上角 */}
            <div className="absolute top-2 left-2 flex gap-1 z-10 bg-card/80 backdrop-blur-sm rounded-md p-1 shadow-sm" onMouseDown={e => e.stopPropagation()}>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomOut}
                    title={t('common.zoomOut') || '缩小'}
                    disabled={scale <= 0.5}
                    className="h-8 w-8 p-0"
                >
                    <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetZoom}
                    title={t('common.resetZoom') || '重置'}
                    className="h-8 px-2 text-xs"
                >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    {Math.round(scale * 100)}%
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomIn}
                    title={t('common.zoomIn') || '放大'}
                    disabled={scale >= 3}
                    className="h-8 w-8 p-0"
                >
                    <ZoomIn className="h-4 w-4" />
                </Button>
            </div>

            {/* 功能按钮 - 右上角 */}
            <div className="absolute top-2 right-2 flex gap-2 z-10" onMouseDown={e => e.stopPropagation()}>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? (t('common.exitFullscreen') || '退出全屏') : (t('common.fullscreen') || '全屏')}
                    className="h-8 w-8 p-0"
                >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                {showCopyButton && (
                    <CopyButton
                        content={chart}
                        successMessage={t('common.copiedToClipboard')}
                        title={t('common.copyCode')}
                    />
                )}
                {showViewCode && (
                    <ViewContentDialog
                        title={title}
                        content={chart}
                        chapterIndex={0}
                    />
                )}
            </div>

            {/* Mermaid图表容器 */}
            <div
                ref={containerRef}
                className={`mermaid-container ${className} ${isFullscreen ? 'h-full w-full flex items-center justify-center' : ''}`}
                style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                    userSelect: 'none'
                }}
            />
        </div>
    )
}
