import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import './utils/chartSetup';
import App from './App';
import { carregarConfigServidor } from './config';

carregarConfigServidor().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
