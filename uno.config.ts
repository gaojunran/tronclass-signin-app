import {
  createLocalFontProcessor,
} from '@unocss/preset-web-fonts/local'
import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetUno,
  presetWebFonts,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  shortcuts: [
    ['btn', 'px-4 py-1 rounded inline-block bg-teal-700 text-white cursor-pointer !outline-none hover:bg-teal-800 disabled:cursor-default disabled:bg-gray-600 disabled:opacity-50'],
    ['icon-btn', 'inline-block cursor-pointer select-none opacity-75 transition duration-200 ease-in-out hover:opacity-100 hover:text-teal-600'],
    ['card', 'bg-slate-900/80 border border-slate-800/60 rounded-xl backdrop-blur-sm'],
    ['card-hover', 'card hover:border-slate-700/80 hover:bg-slate-900/90 transition-all duration-200 cursor-pointer'],
    ['btn-primary', 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'],
    ['btn-secondary', 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/50 rounded-lg transition-all duration-200 cursor-pointer'],
    ['btn-ghost', 'text-slate-400 hover:text-slate-200 transition-colors duration-200 cursor-pointer'],
    ['input-base', 'bg-slate-950/50 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200'],
    ['section-title', 'text-sm font-medium text-slate-400 mb-3'],
    ['page-bg', 'min-h-screen bg-slate-950 text-slate-200 antialiased'],
  ],
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
    }),
    presetTypography(),
    presetWebFonts({
      fonts: {
        sans: 'Inter',
        serif: 'DM Serif Display',
        mono: 'JetBrains Mono',
      },
      processors: createLocalFontProcessor(),
    }),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
  safelist: 'prose prose-sm m-auto text-left'.split(' '),
})
