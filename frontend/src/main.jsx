import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { BrandingProvider } from './context/BrandingContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <BrandingProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              className:
                'text-sm rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100',
            }}
          />
        </BrandingProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
