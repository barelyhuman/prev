import plugins from './plugins.js'

export const config = {
  getKernel: async () => {
    const mod = await import('@barelyhuman/prev/kernel')
    return mod.createHonoKernel
  },
  getPlugins: async () => {
    return plugins
  },
}
