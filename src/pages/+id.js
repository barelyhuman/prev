import Navigation from "../components/navigation.js";
import BaseLayout from "../layouts/BaseLayout.js";

export function get(req, res) {
  return (
    <BaseLayout>
      <Navigation />
      {req.params.id}
    </BaseLayout>
  );
}
