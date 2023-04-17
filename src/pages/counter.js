import Counter from "../components/counter.island.js";
import Navigation from "../components/navigation.js";
import BaseLayout from "../layouts/BaseLayout.js";

export function get(req, res) {
  return (
    <BaseLayout>
      <Navigation />
      <Counter />
    </BaseLayout>
  );
}

export function post(req, res) {
  return res.send({ pong: true });
}
