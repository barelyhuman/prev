import { Router } from "preact-router";
import { useState } from "preact/hooks";

const Home = () => {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
};

const About = () => {
  return <h1>About</h1>;
};

export const App = ({ url }) => {
  return (
    <Router url={url}>
      <Home path="/" />
      <About path="/about" />
    </Router>
  );
};
