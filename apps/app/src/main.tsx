import "@mantine/core/styles.css";
import "./styles.css";

import { MantineProvider } from "@mantine/core";
import { ecommerceTheme } from "@ecommerce/ui";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, NavLink, Route, Routes } from "react-router-dom";
import { App } from "./shell";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider theme={ecommerceTheme}>
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<App />} />
          <Route path="/" element={<Navigate to="/admin" replace />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>
);

export { NavLink, Route, Routes };
