import { Providers } from "./app/providers";
import { Router } from "./app/router";
import "./shared/i18n";

const App = () => (
  <Providers>
    <Router />
  </Providers>
);

export default App;
