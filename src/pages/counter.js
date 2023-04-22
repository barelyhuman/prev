import Counter from '@/components/counter.island.js'
import Navigation from '@/components/navigation.js'
import BaseLayout from '@/layouts/BaseLayout'

export function get(req, res) {
  return (
    <BaseLayout title="Counter">
      <Navigation />
      <Counter />
    </BaseLayout>
  )
}

export function post(req, res) {
  return res.send({ pong: true })
}
