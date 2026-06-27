/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    localStorage.removeItem('imcrm_user_token');
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F1F5F9] flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="w-18 h-18 bg-[#DC2626] text-white rounded-3xl flex items-center justify-center text-2xl font-black mb-6 shadow-md shadow-red-200">
            ⚠
          </div>
          <h2 className="text-xl font-display font-black text-[#0B1F33] mb-2">
            Execution Intercepted Gracefully
          </h2>
          <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
            The ImCRM platform encountered a runtime rendering exception. Active session state has been preserved. Please reset or retry below.
          </p>
          
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 p-5 mb-6 text-left overflow-x-auto text-[11px] font-mono leading-relaxed text-slate-700 bg-slate-50/50">
            <span className="text-red-600 font-bold block mb-1">Error: {this.state.error?.message || 'Unknown render exception'}</span>
            <span className="text-slate-400 block break-all">{this.state.error?.stack}</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-[#0B1F33] hover:bg-[#162E47] text-white text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
            >
              Refresh Workspace
            </button>
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-white hover:bg-slate-50 text-[11px] font-bold uppercase tracking-wider rounded-xl border border-slate-300 text-slate-700 transition-all cursor-pointer active:scale-95"
            >
              Reset Session
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
