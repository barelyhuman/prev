export default function Navigation() {
  return (
    <ul class="flex items-center gap-3 mb-3">
      <li>
        <a class="text-zinc-400 hover:text-zinc-900" href="/">
          Home
        </a>
      </li>
      <li>
        <a class="text-zinc-400 hover:text-zinc-900" href="/security">
          Security
        </a>
      </li>
      <li>
        <a class="text-zinc-400 hover:text-zinc-900" href="/counter">
          Counter
        </a>
      </li>
      <li>
        <a class="text-zinc-400 hover:text-zinc-900" href="/1">
          Parameter: 1
        </a>
      </li>
      <li>
        <a class="text-zinc-400 hover:text-zinc-900" href="/2">
          Parameter: 2
        </a>
      </li>
    </ul>
  );
}
