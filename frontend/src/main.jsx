import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { Toaster } from 'react-hot-toast';
import { TurkeyDataProvider } from './context/TurkeyDataContext';
import { UnreadMessagesProvider } from './context/UnreadMessagesContext';
import { ThemeProvider } from './context/ThemeContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <TurkeyDataProvider>
        <UnreadMessagesProvider>
          <ThemeProvider>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: '#0b1220',
                  color: '#e2e8f0',
                  border: '1px solid #1f2937',
                },
              }}
            />
          </ThemeProvider>
        </UnreadMessagesProvider>
      </TurkeyDataProvider>
    </BrowserRouter>
  </React.StrictMode>
);
