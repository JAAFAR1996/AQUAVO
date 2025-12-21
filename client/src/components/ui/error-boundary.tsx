import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component for catching JavaScript errors in child components.
 * Best practice: Wrap Suspense boundaries and lazy-loaded components with ErrorBoundary.
 * 
 * @example
 * <ErrorBoundary>
 *   <Suspense fallback={<Loading />}>
 *     <LazyComponent />
 *   </Suspense>
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Update state with error info
        this.setState({ errorInfo });

        // Log error to console in development
        if (import.meta.env.DEV) {
            console.error('🚨 ErrorBoundary caught an error:', error, errorInfo);
        }

        // Call optional error handler
        this.props.onError?.(error, errorInfo);

        // In production, could send to error tracking service (e.g., Sentry)
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    handleGoHome = (): void => {
        window.location.href = '/';
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Custom fallback UI if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <div className="min-h-[300px] flex items-center justify-center bg-background">
                    <div className="text-center space-y-4 p-8 max-w-md">
                        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                            <AlertTriangle className="w-8 h-8 text-destructive" />
                        </div>
                        <h2 className="text-xl font-bold">حدث خطأ غير متوقع</h2>
                        <p className="text-muted-foreground text-sm">
                            عذراً، حدث خطأ أثناء تحميل هذا القسم. يرجى المحاولة مرة أخرى.
                        </p>
                        {import.meta.env.DEV && this.state.error && (
                            <details className="text-xs text-left bg-muted p-3 rounded-lg overflow-auto max-h-48">
                                <summary className="cursor-pointer font-semibold mb-2">
                                    تفاصيل الخطأ (وضع التطوير)
                                </summary>
                                <pre className="whitespace-pre-wrap">
                                    <strong>{this.state.error.toString()}</strong>
                                    {this.state.errorInfo && (
                                        <>
                                            {'\n\nComponent Stack:'}
                                            {this.state.errorInfo.componentStack}
                                        </>
                                    )}
                                </pre>
                            </details>
                        )}
                        <div className="flex gap-2 justify-center">
                            <Button variant="outline" onClick={this.handleGoHome} className="gap-2">
                                <Home className="w-4 h-4" />
                                الصفحة الرئيسية
                            </Button>
                            <Button onClick={this.handleRetry} className="gap-2">
                                <RefreshCw className="w-4 h-4" />
                                إعادة المحاولة
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
