import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Page crashed:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return <>{this.props.fallback}</>;

      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-red-500/30 bg-red-500/10 text-4xl">
            ⚠️
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Page load မဖြစ်ဘူး</h2>
            <p className="mt-2 text-sm text-slate-400">
              တစ်ခုခု မှားသွားပါတယ်။ ပြန်စမ်းကြည့်ပါ။
            </p>
            {this.state.error && (
              <p className="mt-2 rounded-lg bg-slate-900 px-3 py-2 font-mono text-[11px] text-red-400">
                {this.state.error.message}
              </p>
            )}
          </div>
          <button
            onClick={this.handleReset}
            className="rounded-2xl bg-amber-500 px-6 py-2.5 text-sm font-black text-slate-950 transition hover:bg-amber-400"
          >
            ပြန်ကြိုးစားမည်
          </button>
        </div>
      );
    }

    return <>{this.props.children}</>;
  }
}

export default ErrorBoundary;
