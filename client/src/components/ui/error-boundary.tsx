import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './button';
import { AlertTriangle, RefreshCw, Home, PackageCheck } from 'lucide-react';

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

const CHUNK_RELOAD_GUARD_KEY = 'aquavo:chunk-reload-guard';
const CHUNK_RELOAD_GUARD_MS = 60_000;

function isOrderConfirmationPath(): boolean {
    return typeof window !== 'undefined'
        && window.location.pathname.startsWith('/order-confirmation/');
}

/**
 * Vite lazy chunks are content-hashed. A tab that stays open across a deploy can
 * still reference the previous hash, which Vercel no longer serves. React.lazy
 * caches that rejected import, so merely resetting an ErrorBoundary cannot
 * recover it; the document itself must be refreshed.
 */
export function isRecoverableChunkLoadError(error: Error | null): boolean {
    if (!error) return false;

    const fingerprint = `${error.name} ${error.message}`.toLowerCase();
    return [
        'chunkloaderror',
        'loading chunk',
        'failed to fetch dynamically imported module',
        'error loading dynamically imported module',
        'importing a module script failed',
        'failed to load module script',
    ].some((pattern) => fingerprint.includes(pattern));
}

function tryAutomaticChunkReload(error: Error): boolean {
    if (typeof window === 'undefined') return false;

    // Order confirmation is a critical post-purchase route. Even when a browser
    // reports an unusual error fingerprint, refresh it once so a customer who
    // completed checkout receives the latest application bundle and can render
    // the session-stashed order instead of seeing a generic application error.
    if (!isOrderConfirmationPath() && !isRecoverableChunkLoadError(error)) return false;

    // sessionStorage is the loop guard. If storage is unavailable, fail closed
    // and leave the user on the fallback instead of risking a reload loop.
    try {
        const now = Date.now();
        const path = `${window.location.pathname}${window.location.search}`;
        const raw = window.sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY);
        const previous = raw ? JSON.parse(raw) as { path?: string; at?: number } : null;
        const alreadyRetriedRecently = previous?.path === path
            && typeof previous.at === 'number'
            && now - previous.at < CHUNK_RELOAD_GUARD_MS;

        if (alreadyRetriedRecently) return false;

        window.sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, JSON.stringify({ path, at: now }));
        window.location.reload();
        return true;
    } catch {
        return false;
    }
}

/**
 * ErrorBoundary component for catching JavaScript errors in child components.
 * It also recovers stale content-hashed lazy chunks after a production deploy.
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
        this.setState({ errorInfo });

        // A stale lazy chunk is a deployment/version mismatch, not an
        // application-state error. Refresh the document once to obtain the new
        // entry bundle and chunk map. The post-checkout confirmation route gets
        // the same one-time recovery for any client-side rendering failure.
        if (tryAutomaticChunkReload(error)) return;

        if (import.meta.env.DEV) {
            console.error('🚨 ErrorBoundary caught an error:', error, errorInfo);
        }

        this.props.onError?.(error, errorInfo);
    }

    handleRetry = (): void => {
        // React.lazy keeps a rejected import promise cached. A normal boundary
        // reset would immediately throw the same error again, so force a full
        // document refresh for chunk failures and for order confirmation.
        if (isOrderConfirmationPath() || isRecoverableChunkLoadError(this.state.error)) {
            window.location.reload();
            return;
        }

        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    handleGoHome = (): void => {
        window.location.href = '/';
    };

    handleTrackOrder = (): void => {
        window.location.href = '/order-tracking';
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            if (isOrderConfirmationPath()) {
                return (
                    <div className="min-h-[300px] flex items-center justify-center bg-background">
                        <div dir="rtl" className="text-center space-y-4 p-8 max-w-md">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                                <PackageCheck className="w-8 h-8 text-primary" />
                            </div>
                            <h2 className="text-xl font-bold">طلبك مسجّل بنجاح</h2>
                            <p className="text-muted-foreground text-sm leading-6">
                                صار خلل مؤقت بعرض تفاصيل التأكيد فقط. طلبك محفوظ عند AQUAVO، فلا تعيد إرسال الطلب مرة ثانية.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                                <Button variant="outline" onClick={this.handleTrackOrder} className="gap-2">
                                    تتبع الطلب
                                </Button>
                                <Button onClick={this.handleRetry} className="gap-2">
                                    <RefreshCw className="w-4 h-4" />
                                    إعادة تحميل التأكيد
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            }

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
