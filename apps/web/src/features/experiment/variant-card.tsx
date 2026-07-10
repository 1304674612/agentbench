export interface VariantConfig {
  name: string
  config: unknown
}

export interface VariantCardProps {
  variant: VariantConfig
  className?: string
}

export function VariantCard({ variant, className = '' }: VariantCardProps) {
  const vc = variant.config as Record<string, unknown>
  const model = vc.model as string | undefined
  const temperature = vc.temperature as number | undefined
  const systemPrompt = vc.systemPrompt as string | undefined
  const tools = vc.tools as Array<{ name: string }> | undefined

  return (
    <div className={`rounded-lg border border-border bg-muted/30 p-2.5 ${className}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[10px] font-bold bg-foreground text-background rounded-full w-4 h-4 inline-flex items-center justify-center">
          {variant.name}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {model ? `Model: ${model}` : ''}
          {temperature !== undefined ? ` · T=${String(temperature)}` : ''}
        </span>
      </div>
      {systemPrompt && (
        <p className="text-[10px] text-muted-foreground line-clamp-2">
          {systemPrompt.slice(0, 120)}
        </p>
      )}
      {tools && tools.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {tools.slice(0, 3).map((tool) => (
            <span
              key={tool.name}
              className="text-[9px] bg-muted text-muted-foreground rounded px-1 py-0.5 font-mono"
            >
              {tool.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
