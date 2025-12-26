import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

/**
 * Catches unexpected runtime errors so the app can render a friendly fallback
 * instead of leaving users with a blank screen.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught app error:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, errorMessage: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen w-screen bg-paper dark:bg-paper-dark px-6">
          <div className="max-w-lg w-full bg-white dark:bg-charcoal-dark rounded-xl shadow-card dark:shadow-card-dark border border-chrome/60 dark:border-border-dark/60 p-8 space-y-4 text-center">
            <h1 className="text-2xl font-bold font-sans text-coral">Something went wrong</h1>
            <p className="text-charcoal/80 dark:text-text-dark/80">
              The app hit an unexpected error. Please reload the page. If the problem
              continues, check your connection and try clearing cached data.
            </p>
            {this.state.errorMessage && (
              <p className="text-sm text-charcoal/60 dark:text-text-dark/60 break-words">
                {this.state.errorMessage}
              </p>
            )}
            <button
              onClick={this.handleReload}
              className="mt-2 px-5 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-accent/90 transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

