import Navigation from '@/components/navigation.js'
import BaseLayout from '@/layouts/BaseLayout'

export function get(ctx) {
  const { id: paramId } = ctx.req.params
  return (
    <BaseLayout title={`Parameterised ${paramId}`}>
      <Navigation />
      {paramId}
      <p>
        The above came from the url, changing at realtime, or even faster, based
        on what's available
      </p>
    </BaseLayout>
  )
}
