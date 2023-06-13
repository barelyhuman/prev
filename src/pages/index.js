import Navigation from '@/components/navigation.js'
import BaseLayout from '@/layouts/BaseLayout'

export function get() {
  return (
    <BaseLayout title="Home">
      <Navigation />
      <h1 class="text-xl font-semibold">Hopefully this works</h1>
      <h2 class="bg-red-500">I wish it was a bit faster</h2>
      <p>Yeah, a lot more faster than this, would help</p>
    </BaseLayout>
  )
}
