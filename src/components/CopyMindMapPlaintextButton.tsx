import React from 'react'
import { Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { mindElixirToPlaintext } from 'mind-elixir/plaintextConverter'
import { Button } from './ui/button'
import type { MindMapRef } from './ui/mindmap'

interface CopyMindMapPlaintextButtonProps {
  mindElixirRef:
    | React.RefObject<MindMapRef | null>
    | (() => MindMapRef | null | undefined)
}

export const CopyMindMapPlaintextButton: React.FC<
  CopyMindMapPlaintextButtonProps
> = ({ mindElixirRef }) => {
  const { t } = useTranslation()

  const handleCopy = () => {
    let instance
    if (typeof mindElixirRef === 'function') {
      instance = mindElixirRef()?.instance
    } else {
      instance = mindElixirRef.current?.instance
    }

    if (!instance) return

    // 使用 mind-elixir 内置的对象转纯文本（plaintext）功能
    const plaintext = mindElixirToPlaintext(instance.getData())
    navigator.clipboard.writeText(plaintext)
    toast.success(t('download.copiedPlaintext'), {
      duration: 2000,
      position: 'top-center',
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      title={t('download.copyPlaintext')}>
      <Copy className="h-4 w-4" />
    </Button>
  )
}
