import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-[400px] p-8 flex flex-col items-center justify-center bg-neutral-900/80 backdrop-blur-xl border border-red-500/20 rounded-3xl text-center shadow-2xl my-6">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 mb-4 animate-bounce">
            <AlertTriangle size={36} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {this.props.fallbackTitle || 'Ops, algo inesperado aconteceu nesta seção'}
          </h2>
          <p className="text-xs text-white/60 max-w-md leading-relaxed mb-6 font-mono">
            {this.state.error?.message || 'Ocorreu um erro ao renderizar este componente.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-950/40"
            >
              <RefreshCw size={14} />
              <span>Recarregar Tela</span>
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <Home size={14} />
              <span>Ir para o Início</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
