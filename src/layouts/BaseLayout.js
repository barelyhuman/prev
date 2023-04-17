import { useTitle } from "../lib/head";

export default function BaseLayout({ children }) {
  useTitle("Preact Island Example");
  return <div class="max-w-3xl mx-auto">{children}</div>;
}
