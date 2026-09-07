import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { ProviderOption } from '@/config/ai-providers'

interface ProviderSelectorProps {
  value: string
  options: ProviderOption[]
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
}

/**
 * 通用供应商下拉选择器（受控、无业务判断）。
 * 支持按供应商名称或 provider id 搜索，适配 200+ 选项。
 */
export function ProviderSelector({
  value,
  options,
  onChange,
  placeholder = 'Select provider...',
  searchPlaceholder = 'Search provider...',
  emptyText = 'No provider found.',
  className,
  disabled = false,
}: ProviderSelectorProps) {
  const [open, setOpen] = useState(false)

  const selected = options.find((option) => option.value === value)

  return (
    <Popover open={disabled ? false : open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', className)}
          disabled={disabled}>
          <span className="truncate">{selected?.label ?? value ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        // Dialog 的滚动锁（react-remove-scroll）会拦截下拉列表的 wheel 事件导致无法滚动，
        // 在捕获阶段阻断传播，让列表恢复原生滚动（https://github.com/radix-ui/primitives/issues/1155）
        onWheelCapture={(e) => e.stopPropagation()}>
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-[300px] overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  // 名称 + id 同时参与搜索
                  value={`${option.label} ${option.value}`}
                  onSelect={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}>
                  <span className="truncate">{option.label}</span>
                  <Check
                    className={cn(
                      'ml-auto h-4 w-4 shrink-0',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
