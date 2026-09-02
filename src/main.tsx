import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Add error boundary for production
class ErrorBoundary extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorBoundary';
  }
}

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Initialize app
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element not found');
}

try {
  const root = createRoot(rootElement);
  root.render(<App />);
  console.log('✅ App initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize app:', error);
  
  // Fallback UI
  rootElement.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #1f1f1f;
      color: #c0c0c0;
      font-family: monospace;
      padding: 20px;
      text-align: center;
    ">
      <h1 style="color: #00FFCC; margin-bottom: 20px;">DASSH - Loading Error</h1>
      <p style="margin-bottom: 20px;">There was an error loading the application.</p>
      <p style="font-size: 14px; opacity: 0.7;">Please check the console for more details and try refreshing the page.</p>
      <button 
        onclick="window.location.reload()" 
        style="
          margin-top: 20px;
          padding: 10px 20px;
          background: transparent;
          border: 1px solid #00FFCC;
          color: #00FFCC;
          border-radius: 4px;
          cursor: pointer;
          font-family: monospace;
        "
      >
        Refresh Page
      </button>
    </div>
  `;
}