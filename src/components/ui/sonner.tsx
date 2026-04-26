import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-400" />,
        info: <InfoIcon className="size-4 text-sky-400" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-400" />,
        error: <OctagonXIcon className="size-4 text-red-400" />,
        loading: <Loader2Icon className="size-4 animate-spin text-white/70" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            'group/toast !bg-black/70 !text-white !border !border-white/10 !rounded-xl !shadow-[0_10px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl backdrop-saturate-150',
          title: '!text-sm !font-semibold tracking-tight',
          description: '!text-xs !text-white/70',
          actionButton: '!bg-white !text-black hover:!bg-white/90',
          cancelButton: '!bg-white/10 !text-white hover:!bg-white/20',
        },
      }}
      style={
        {
          '--normal-bg': 'transparent',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'transparent',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
