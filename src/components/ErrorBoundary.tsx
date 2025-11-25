import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console (in production, send to error tracking service)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-destructive/10 rounded-full">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">משהו השתבש</h1>
              <p className="text-muted-foreground">
                אירעה שגיאה בלתי צפויה. נסה לרענן את הדף או לחזור לדשבורד.
              </p>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <div className="text-right">
                <details className="bg-muted p-4 rounded-lg">
                  <summary className="cursor-pointer text-sm font-medium mb-2">
                    פרטי השגיאה (מצב פיתוח)
                  </summary>
                  <pre className="text-xs overflow-auto max-h-40 text-destructive">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleReset} variant="outline">
                <RefreshCw className="h-4 w-4 ml-2" />
                נסה שוב
              </Button>
              <Button onClick={this.handleGoHome}>
                <Home className="h-4 w-4 ml-2" />
                חזור לדשבורד
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Smaller error fallback for page-level errors
export const PageErrorFallback = ({ pageName }: { pageName: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center" dir="rtl">
    <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
    <h2 className="text-xl font-semibold mb-2">שגיאה בטעינת {pageName}</h2>
    <p className="text-muted-foreground mb-4">לא הצלחנו לטעון את הדף. נסה לרענן.</p>
    <Button onClick={() => window.location.reload()} variant="outline" size="sm">
      <RefreshCw className="h-4 w-4 ml-2" />
      רענן
    </Button>
  </div>
);
