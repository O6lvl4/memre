import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./contexts/AuthContext";
import { AppPage } from "./pages/AppPage";
import "./styles/globals.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <AppPage />
    </AuthProvider>
  </React.StrictMode>
);
