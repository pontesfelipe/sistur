import React from "react";

interface State {
  error: Error | null;
}

/**
 * Captures render-time errors from descendants and shows a friendly fallback
 * instead of a blank white screen. Also logs the error to the console so it
 * appears in client-error monitoring.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; label?: string },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary${this.props.label ? ` ${this.props.label}` : ""}]`, error, info?.componentStack);
  }

  private handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const message = this.state.error.message || String(this.state.error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-lg w-full border border-border rounded-lg p-6 bg-card text-card-foreground space-y-3">
          <h1 className="text-lg font-semibold">Ocorreu um erro ao carregar a página</h1>
          <p className="text-sm text-muted-foreground break-words">{message}</p>
          <div className="flex gap-2">
            <button
              onClick={this.handleReload}
              className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground"
            >
              Recarregar
            </button>
            <a
              href="/"
              className="text-sm px-3 py-1.5 rounded-md border border-border"
            >
              Voltar ao início
            </a>
          </div>
        </div>
      </div>
    );
  }
}