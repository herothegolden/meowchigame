// src/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Store error details in state
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Send error to analytics or error reporting service
    try {
      // You can integrate with error tracking services here
      // Example: Sentry.captureException(error, { extra: errorInfo });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  handleRetry = () => {
    // Reset error state to retry
    this.setState({ hasError: false, error: null, errorInfo: null });
    
    // Haptic feedback for retry action
    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    } catch {}
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="error-boundary">
          <div className="error-content">
            <div className="error-icon">😿</div>
            <h2 className="error-title">Oops! Something went wrong</h2>
            <p className="error-message">
              The cats got a bit too excited and knocked something over. 
              Don't worry, we can fix this!
            </p>
            
            <div className="error-actions">
              <button className="btn primary" onClick={this.handleRetry}>
                🔄 Try Again
              </button>
              <button 
                className="btn" 
                onClick={() => window.location.reload()}
              >
                🏠 Restart App
              </button>
            </div>

            {/* Show error details in development */}
            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>🔍 Technical Details (Dev Only)</summary>
                <div className="error-stack">
                  <h4>Error:</h4>
                  <pre>{this.state.error && this.state.error.toString()}</pre>
                  
                  <h4>Component Stack:</h4>
                  <pre>{this.state.errorInfo.componentStack}</pre>
                </div>
              </details>
            )}
          </div>

          <style jsx>{`
            .error-boundary {
              height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: var(--bg);
              padding: 20px;
            }

            .error-content {
              text-align: center;
              max-width: 400px;
              background: var(--card);
              border-radius: 20px;
              padding: 40px 30px;
              border: 1px solid var(--border);
            }

            .error-icon {
              font-size: 64px;
              margin-bottom: 20px;
            }

            .error-title {
              font-size: 24px;
              font-weight: 700;
              color: var(--text);
              margin: 0 0 16px 0;
            }

            .error-message {
              font-size: 16px;
              color: var(--muted);
              line-height: 1.5;
              margin: 0 0 32px 0;
            }

            .error-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
              margin-bottom: 20px;
            }

            .error-details {
              text-align: left;
              margin-top: 24px;
              padding: 16px;
              background: var(--surface);
              border-radius: 8px;
              border: 1px solid var(--border);
            }

            .error-details summary {
              cursor: pointer;
              font-weight: 600;
              color: var(--accent);
              margin-bottom: 12px;
            }

            .error-stack pre {
              background: #f5f5f5;
              padding: 12px;
              border-radius: 4px;
              font-size: 12px;
              overflow: auto;
              max-height: 200px;
              font-family: 'Courier New', monospace;
            }

            .error-stack h4 {
              margin: 16px 0 8px 0;
              font-size: 14px;
              color: var(--text);
            }

            @media (max-width: 480px) {
              .error-content {
                padding: 30px 20px;
                margin: 0 10px;
              }
              
              .error-actions {
                flex-direction: column;
              }
              
              .error-actions .btn {
                width: 100%;
              }
            }
          `}</style>
        </div>
      );
    }

    // Render children normally if no error
    return this.props.children;
  }
}

export default ErrorBoundary;
