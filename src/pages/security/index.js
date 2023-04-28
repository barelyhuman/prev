import Navigation from '@/components/navigation.js'
import BaseLayout from '@/layouts/BaseLayout'

export function get(ctx) {
  return (
    <BaseLayout title="Security">
      <Navigation />
      <h1 class="font-semibold">Security</h1>
      <p>Hello</p>
    </BaseLayout>
  )
}
