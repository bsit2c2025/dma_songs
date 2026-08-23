import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { missingEnv } from "./lib/env";
import { SetupNotice } from "./components/common/SetupNotice";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {missingEnv.length > 0 ? <SetupNotice missing={missingEnv} /> : <App />}
  </React.StrictMode>,
);
