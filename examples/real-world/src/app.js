import { Router } from "preact-router";
import { useLink, useTitle } from "@barelyhuman/prev/head";
import { HomePage } from "./pages/home";
import "./app.css";

export const App = ({ url }) => {
  useLink({
    rel: "stylesheet",
    href: "/app.css",
  });
  useTitle("Hello there");
  return (
    <>
      <Router url={url}>
        <HomePage path="/" />
      </Router>
    </>
  );
};
