import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

window.addEventListener("error", (event) => {
  document.body.innerHTML = `
    <div style="
      padding:40px;
      font-family:Arial,sans-serif;
      background:#0b0c10;
      color:#fff;
      min-height:100vh;
    ">
      <h1 style="color:#ff5555;">ModelForge Runtime Error</h1>
      <pre style="
        white-space:pre-wrap;
        margin-top:20px;
        padding:20px;
        background:#15171d;
        border-radius:10px;
      ">${event.error?.stack || event.message}</pre>
    </div>
  `;
});

window.addEventListener("unhandledrejection", (event) => {
  document.body.innerHTML = `
    <div style="
      padding:40px;
      font-family:Arial,sans-serif;
      background:#0b0c10;
      color:#fff;
      min-height:100vh;
    ">
      <h1 style="color:#ff5555;">ModelForge Runtime Error</h1>
      <pre style="
        white-space:pre-wrap;
        margin-top:20px;
        padding:20px;
        background:#15171d;
        border-radius:10px;
      ">${event.reason?.stack || event.reason}</pre>
    </div>
  `;
});

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);