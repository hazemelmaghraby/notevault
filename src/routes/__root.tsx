
/// <reference types="vite/client" />

import {
  HeadContent,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import type { ReactNode } from 'react'
import indexCss from '../index.css?url'

const APP_NAME = 'NoteVault'
const APP_DESCRIPTION =
  'Your personal notes and records, securely organized.'

const themeInitScript = `
  (function () {
    try {
      var theme = localStorage.getItem('theme')
      var isDark =
        theme === 'dark' ||
        (!theme &&
          window.matchMedia('(prefers-color-scheme: dark)').matches)

      document.documentElement.classList.toggle('dark', isDark)
    } catch (error) {
      // Keep the app usable if browser storage is unavailable.
    }
  })()
`

const queryClient = new QueryClient()

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1.0',
      },
      { title: APP_NAME },
      {
        name: 'description',
        content: APP_DESCRIPTION,
      },
      { name: 'theme-color', content: '#171513' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: APP_NAME },
      {
        property: 'og:description',
        content: APP_DESCRIPTION,
      },
      { property: 'og:site_name', content: APP_NAME },
      { property: 'og:locale', content: 'en_US' },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
    ],
    links: [
      { rel: 'stylesheet', href: indexCss },
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/notevault-icon.svg',
      },
      {
        rel: 'manifest',
        href: '/manifest.webmanifest',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeInitScript,
          }}
        />

        <HeadContent />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'WebSite',
                  name: APP_NAME,
                  description: APP_DESCRIPTION,
                },
                {
                  '@type': 'Organization',
                  name: APP_NAME,
                },
              ],
            }),
          }}
        />
      </head>

      <body>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delayDuration={0}>
            <Toaster />
            {children}
          </TooltipProvider>
        </QueryClientProvider>

        <Scripts />
      </body>
    </html>
  )
}
