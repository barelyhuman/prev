import Navigation from "../components/navigation.js";
import BaseLayout from "../layouts/BaseLayout.js";

export function get(req, res) {
  return (
    <BaseLayout>
      <Navigation />

      <h1 class="font-semibold">Home</h1>
    </BaseLayout>
  );
}
