import BaseLayout from '@/layouts/BaseLayout'
import Navigation from '@/components/navigation'

const h1 = props => {
  return <h1 className="font-bold" {...props}></h1>
}

const components = {
  h1,
}

export async function get(ctx) {
  const postName = ctx.req.param('postId')
  const mod = await import(`../../content/${postName}.js?update=${Date.now()}`)
  const Component = mod.default
  return (
    <BaseLayout>
      <Navigation />
      <Component components={components} />
    </BaseLayout>
  )
}
