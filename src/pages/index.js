import Navigation from '@/components/navigation.js'
import BaseLayout from '@/layouts/BaseLayout'

export function get(req, res) {
  return (
    <BaseLayout title="Home">
      <Navigation />
      <h1 class="font-semibold">Something works</h1>
    </BaseLayout>
  )
}
