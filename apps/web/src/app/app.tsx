import { Button } from "@mui/material";
import { h, FunctionalComponent } from "preact";

import { Header } from "~components/header";

import styles from "./app.module.scss";

export const App: FunctionalComponent = () => {
  return (
    <div className={styles.app}>
      <Header />
      <main>
        <Button>Hello</Button>
      </main>
    </div>
  );
};

export default App;
