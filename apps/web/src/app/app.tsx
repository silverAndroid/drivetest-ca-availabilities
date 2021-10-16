import { h, FunctionalComponent } from "preact";
import { Button } from "@mui/material";

import styles from "./app.module.scss";

import { ReactComponent as Logo } from "./logo.svg";

export const App: FunctionalComponent = () => {
  return (
    <div className={styles.app}>
      <header className="flex">
        <Logo width="75" height="75" />
        <h1>Welcome to web!</h1>
      </header>
      <main>
        <Button>Hello</Button>
      </main>
    </div>
  );
};

export default App;
