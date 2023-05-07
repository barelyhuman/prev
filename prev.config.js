export const config = {
  getKernel: async () => {
    const mod = await import('@barelyhuman/prev/kernel')
    return mod.createHonoKernel
  },
}
