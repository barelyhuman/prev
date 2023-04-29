import Counter from '@/components/counter.island.js'
import Navigation from '@/components/navigation.js'
import BaseLayout from '@/layouts/BaseLayout'

export function get(ctx) {
  return (
    <BaseLayout title="Counter">
      <Navigation />
      <Counter />
      <p>It doesn't reset the island, but the diff isn't calculated right</p>
      <h1>Goes up to 7 instead of 1, since the last state was 6</h1>
    </BaseLayout>
  )
}

export function post(req, res) {
  return res.send({ pong: true })
}
