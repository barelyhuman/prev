import Navigation from "../../components/navigation.js";
import BaseLayout from "../../layouts/BaseLayout.js";

export function get(req, res) {
  return (
    <BaseLayout title="Security">
      <Navigation />
      <h1 class="font-semibold">Security</h1>
    </BaseLayout>
  );
}