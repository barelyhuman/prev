import Navigation from '@/components/navigation.js'
import BaseLayout from '@/layouts/BaseLayout'

export function get(req, res) {
  return (
    <BaseLayout title={`Parameterised ${req.params.id}`}>
      <Navigation />
      {req.params.id}
    </BaseLayout>
  )
}
