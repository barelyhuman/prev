import Navigation from '@/components/navigation.js'
import BaseLayout from '@/layouts/BaseLayout'

export function get(req, res) {
  return (
    <BaseLayout title={`Parameterised ${req.params.id}`}>
      <Navigation />
      {req.params.id}
      <p>
        The above came from the url, changing at realtime, or even faster, based
        on what's available
      </p>
    </BaseLayout>
  )
}
