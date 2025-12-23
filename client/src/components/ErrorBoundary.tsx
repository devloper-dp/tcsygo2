import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        this.setState({
            error,
            errorInfo,
        });

        // Log to error reporting service (e.g., Sentry)
        if (typeof window !== 'undefined' && (window as any).errorLogger) {
            (window as any).errorLogger.logError(error, errorInfo);
        }
    }

    private handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    private handleGoHome = () => {
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <Card className="max-w-2xl w-full p-8">
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>

                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Oops! Something went wrong
                                </h1>
                                <p className="text-gray-600">
                                    We're sorry for the inconvenience. The application encountered an unexpected error.
                                </p>
                            </div>

                            {this.state.error && (
                                <details className="w-full text-left">
                                    <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                                        Error Details
                                    </summary>
                                    <div className="mt-4 p-4 bg-gray-100 rounded-md">
                                        <p className="text-sm font-mono text-red-600 mb-2">
                                            {this.state.error.toString()}
                                        </p>
                                        {this.state.errorInfo && (
                                            <pre className="text-xs text-gray-700 overflow-auto max-h-64">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        )}
                                    </div>
                                </details>
                            )}

                            <div className="flex gap-4">
                                <Button
                                    onClick={this.handleReset}
                                    variant="outline"
                                    className="gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Try Again
                                </Button>
                                <Button
                                    onClick={this.handleGoHome}
                                    className="gap-2"
                                >
                                    <Home className="w-4 h-4" />
                                    Go to Home
                                </Button>
                            </div>

                            <p className="text-sm text-gray-500">
                                If this problem persists, please contact support.
                            </p>
                        </div>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    fallback?: ReactNode
) {
    return function WithErrorBoundaryComponent(props: P) {
        return (
            <ErrorBoundary fallback={fallback}>
                <Component {...props} />
            </ErrorBoundary>
        );
    };
}
