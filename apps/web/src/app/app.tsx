import { LocalizationProvider } from "@mui/lab";
import LuxonAdapter from "@mui/lab/AdapterLuxon";
import { h, FunctionalComponent } from "preact";
import { Route, Router } from "preact-router";

import { Header } from "~components/header";
import Availabilities from "~pages/availablities";
import Options from "~pages/options";

import styles from "./app.module.scss";

export const App: FunctionalComponent = () => {
  return (
    <LocalizationProvider dateAdapter={LuxonAdapter}>
      <div class={styles.app}>
        <Header />
        <main>
          <Router>
            <Route path="/" component={Options} />
            <Route path="/availabilities" component={Availabilities} />
          </Router>
        </main>
      </div>
    </LocalizationProvider>
  );
};

export default App;
