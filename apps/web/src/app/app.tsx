import { h, FunctionalComponent } from "preact";
import { Button } from "@mui/material";

import styles from "./app.module.scss";
import { Header } from "~components/header";

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
