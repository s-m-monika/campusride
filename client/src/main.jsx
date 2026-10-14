import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
// Bundled locally (not from a CDN) so the Leaflet fallback map still styles
// correctly when the network blocks third-party CDNs or Tracking Prevention
// blocks cross-site storage access to unpkg.
import 'leaflet/dist/leaflet.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
