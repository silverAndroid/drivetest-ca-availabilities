import { FunctionalComponent, h } from "preact";
import { Route, Router } from "preact-router";

import Header from "./header";

import Home from "~pages/home";
import NotFoundPage from "~pages/notfound";
import Profile from "~pages/profile";

const App: FunctionalComponent = () => {
  return (
    <div id="preact_root">
      <Header />
      <Router>
        <Route path="/" component={Home} />
        <Route path="/profile/" component={Profile} user="me" />
        <Route path="/profile/:user" component={Profile} />
        <NotFoundPage default />
      </Router>
    </div>
  );
};

export default App;
