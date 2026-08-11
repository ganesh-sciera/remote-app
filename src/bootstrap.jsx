/**
 * bootstrap.jsx
 * Entry point when the remote is run standalone (npm run dev / npm start).
 * In production only the federated exports matter — this file is ignored.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
