import { useState } from 'preact/hooks'

export default function Counter() {
  const [count, setCount] = useState(0)
  return (
    <>
      <button
        class="bg-zinc-900 hover:bg-zinc-700 text-zinc-100 min-h-[32px] px-5 rounded-md"
        onClick={_ => setCount(count + 1)}
      >
        {count}
      </button>
    </>
  )
}
