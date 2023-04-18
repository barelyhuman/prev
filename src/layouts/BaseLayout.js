import { useTitle } from "../lib/head";

export default function BaseLayout({ title, children }) {
  useTitle(title || "Preact Island Example");
  return <div class="max-w-3xl mx-auto">{children}</div>;
}
