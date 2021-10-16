import { FunctionalComponent } from "preact";

import { ReactComponent as Logo } from "../../app/logo.svg";

export const Header: FunctionalComponent = () => {
  return (
    <header className="flex">
      <Logo width="75" height="75" />
      <h1>Welcome to web!</h1>
    </header>
  );
};
