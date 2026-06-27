/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { 
  KeyRound, Mail, Shield, Users, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft, RefreshCw, Lock
} from 'lucide-react';
import ImCrmLogo from './ImCrmLogo';

export default function LoginScreen() {
  const { login } = useAppStore();
  
  // View states: 'login' | 'forgot' | 'reset'
  const [view, setView] = useState<'login' | 'forgot' | 'reset'>('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // UX states
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Recovery Token state
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);

  // Parse hash parameters for password recovery redirection
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.replace('#', '?'));
        const accessToken = params.get('access_token');
        const type = params.get('type');
        if (type === 'recovery' && accessToken) {
          setRecoveryToken(accessToken);
          setView('reset');
          setSuccessMessage('Secure recovery link validated. Please enter your new password.');
          // Clear hash to protect the token and prevent redundant loops
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }
    };

    handleHash();
    // Pre-fill email if "Remember Me" was previously activated
    const rememberedEmail = localStorage.getItem('imcrm_remembered_email');
    const isRemembered = localStorage.getItem('imcrm_remember_me') === 'true';
    if (isRemembered && rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  // Simple Email Validation
  const validateEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  // Caps Lock Listener
  const checkCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState('CapsLock')) {
      setIsCapsLockOn(true);
    } else {
      setIsCapsLockOn(false);
    }
  };

  // Submit standard login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setLocalError('Incorrect email or password.');
      return;
    }

    setLocalError(null);
    setIsLoading(true);

    try {
      const result = await login(email.trim(), password.trim());
      if (result.success) {
        if (rememberMe) {
          localStorage.setItem('imcrm_remembered_email', email.trim());
          localStorage.setItem('imcrm_remember_me', 'true');
        } else {
          localStorage.removeItem('imcrm_remembered_email');
          localStorage.setItem('imcrm_remember_me', 'false');
        }
      } else {
        // Clean production messages
        if (result.error?.includes('invalid_credentials') || result.error?.includes('Invalid login credentials') || result.error?.includes('failed')) {
          setLocalError('Incorrect email or password.');
        } else if (result.error?.includes('Failed to fetch') || result.error?.includes('network')) {
          setLocalError('Unable to connect.');
        } else {
          setLocalError(result.error || 'Incorrect email or password.');
        }
      }
    } catch (err: any) {
      setLocalError('Unable to connect.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit forgot password request
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setLocalError('Please enter your work email address.');
      return;
    }
    if (!validateEmail(email.trim())) {
      setLocalError('Please enter a valid work email address.');
      return;
    }

    setLocalError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          redirectTo: window.location.origin // standard frame origin support
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setLocalError(data.error || 'Incorrect email or password.');
        return;
      }

      setSuccessMessage('Password reset email sent.');
      setEmail(''); // Clear state on success
    } catch (err) {
      setLocalError('Unable to connect.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit new password update
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setLocalError('Please fill in both password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    if (!recoveryToken) {
      setLocalError('Reset link expired.');
      return;
    }

    setLocalError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: newPassword,
          token: recoveryToken
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setLocalError(data.error || 'Reset link expired.');
        return;
      }

      setSuccessMessage('Password updated successfully. Redirecting to Login...');
      setNewPassword('');
      setConfirmPassword('');
      setRecoveryToken(null);
      
      // Delay navigation back to login
      setTimeout(() => {
        setSuccessMessage(null);
        setView('login');
      }, 3000);

    } catch (err) {
      setLocalError('Unable to connect.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-[#F1F5F9] flex flex-col lg:flex-row z-50 overflow-hidden leading-normal">
      
      {/* LEFT PANEL: Enterprise Branding & Key Corporate Capabilities */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-[#0B1F33] text-white w-2/5 shrink-0 h-full border-r border-[#1e293b]/30">
        {/* Top Logo */}
        <div className="flex items-center">
          <ImCrmLogo size="md" layout="horizontal" showText={true} />
        </div>

        {/* Dynamic Marketing & Features */}
        <div className="space-y-8 my-auto max-w-sm">
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-bold text-white tracking-tight leading-snug">
              Unify Your Property Sales Pipeline In Real-Time
            </h2>
            <p className="text-slate-300 text-xs leading-relaxed">
              Accelerate turnaround speed, host high-fidelity physical tours, and automate lead callbacks with built-in action trackers.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-start space-x-3 p-3 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-premium-gold text-sm" aria-hidden="true">⚡</span>
              <div>
                <p className="font-bold text-white leading-none">Instant Callback Follow-ups</p>
                <p className="text-[10px] text-slate-300 mt-1">Never let a buyer go cold. Automatically alert agents on due dates.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-premium-gold text-sm" aria-hidden="true">🏢</span>
              <div>
                <p className="font-bold text-white leading-none">Physical Tower Inventories</p>
                <p className="text-[10px] text-slate-300 mt-1">Directly view and assign flat availability across complete properties layout.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-premium-gold text-sm" aria-hidden="true">🔒</span>
              <div>
                <p className="font-bold text-white leading-none">Secure Permission Gates</p>
                <p className="text-[10px] text-slate-300 mt-1">Dynamic data visibility restricts access by Company Admin, Team Leader, or Sales Executive credentials.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-[10px] text-slate-400">
          <p>© 2026 ImCRM Enterprise Systems. All rights secured.</p>
        </div>
      </div>

      {/* RIGHT PANEL: Responsive Form Area */}
      <div className="flex-1 flex flex-col justify-between p-6 md:p-12 lg:p-16 bg-[#F1F5F9] h-full overflow-y-auto custom-scroll">
        
        {/* Branding header shown ONLY on mobile */}
        <div className="flex flex-col items-center mt-4 mb-2 text-center lg:hidden bg-[#0B1F33] p-4 py-3 rounded-2xl shadow-md border border-slate-700/30">
          <ImCrmLogo size="sm" layout="horizontal" showText={true} />
        </div>

        {/* Centered Card Panel */}
        <div className="w-full max-w-md mx-auto my-auto space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-5 transition-all duration-300">
            
            {/* VIEW 1: LOGIN FORM */}
            {view === 'login' && (
              <>
                <div>
                  <h2 className="text-base font-display font-bold text-primary-navy">System Login</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">Provide credentials to authenticate access to your company database.</p>
                </div>

                {localError && (
                  <div className="p-3 rounded-xl bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold flex items-start space-x-2 animate-fade-in" role="alert">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <span>{localError}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="p-3 rounded-xl bg-green-50 text-green-700 border border-green-100 text-[10px] font-bold flex items-start space-x-2 animate-fade-in" role="status">
                    <CheckCircle className="w-4 h-4 shrink-0 text-green-600 mt-0.5" />
                    <span>{successMessage}</span>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {/* Email Input */}
                  <div className="space-y-1">
                    <label htmlFor="login-email-input" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Work Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                        <Mail className="w-4 h-4 text-slate-400" />
                      </span>
                      <input
                        type="email"
                        id="login-email-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@example.com"
                        required
                        className="w-full pl-10 pr-4 h-11 bg-[#F1F5F9] text-xs font-semibold text-[#0B1F33] outline-none border border-slate-200 focus:border-premium-gold focus:ring-2 focus:ring-premium-gold/20 rounded-xl transition-all leading-none"
                        aria-label="Work Email Address"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label htmlFor="login-password-input" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Access Security Password
                      </label>
                      <button
                        type="button"
                        onClick={() => { setLocalError(null); setSuccessMessage(null); setView('forgot'); }}
                        className="text-[10px] font-bold text-premium-gold hover:text-[#B38E3F] hover:underline bg-transparent border-none p-0 cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                        <KeyRound className="w-4 h-4 text-slate-400" />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="login-password-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyUp={checkCapsLock}
                        onKeyDown={checkCapsLock}
                        placeholder="••••••••"
                        required
                        className="w-full pl-10 pr-10 h-11 bg-[#F1F5F9] text-xs font-semibold text-[#0B1F33] outline-none border border-slate-200 focus:border-premium-gold focus:ring-2 focus:ring-premium-gold/20 rounded-xl transition-all leading-none"
                        aria-label="Access Security Password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    {isCapsLockOn && (
                      <div className="text-[9px] text-amber-600 font-semibold flex items-center space-x-1 mt-1 animate-pulse">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        <span>Caps Lock is ON</span>
                      </div>
                    )}
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="checkbox"
                      id="remember-me-checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-premium-gold focus:ring-premium-gold/20 accent-[#C9A24D] cursor-pointer"
                    />
                    <label htmlFor="remember-me-checkbox" className="text-[10px] font-bold text-slate-500 uppercase select-none cursor-pointer">
                      Remember Me
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-premium-gold hover:bg-[#B38E3F] text-white text-xs font-bold uppercase tracking-widest active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all border-none rounded-xl mt-3 shadow-md flex items-center justify-center cursor-pointer"
                    id="login-submit-btn"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        Authenticating...
                      </>
                    ) : (
                      'Authenticate Access'
                    )}
                  </button>
                </form>
              </>
            )}

            {/* VIEW 2: FORGOT PASSWORD FORM */}
            {view === 'forgot' && (
              <>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => { setLocalError(null); setSuccessMessage(null); setView('login'); }}
                    className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-500 hover:text-primary-navy uppercase transition-all bg-transparent border-none p-0 cursor-pointer mb-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to login</span>
                  </button>
                  <h2 className="text-base font-display font-bold text-primary-navy">Recover Password</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">Enter your work email address below. If registered, we will deliver password recovery instructions to your inbox.</p>
                </div>

                {localError && (
                  <div className="p-3 rounded-xl bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold flex items-start space-x-2 animate-fade-in" role="alert">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <span>{localError}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="p-3 rounded-xl bg-green-50 text-green-700 border border-green-100 text-[10px] font-bold flex items-start space-x-2 animate-fade-in" role="status">
                    <CheckCircle className="w-4 h-4 shrink-0 text-green-600 mt-0.5" />
                    <span>{successMessage}</span>
                  </div>
                )}

                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  {/* Email Input */}
                  <div className="space-y-1">
                    <label htmlFor="forgot-email-input" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Work Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                        <Mail className="w-4 h-4 text-slate-400" />
                      </span>
                      <input
                        type="email"
                        id="forgot-email-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@example.com"
                        required
                        className="w-full pl-10 pr-4 h-11 bg-[#F1F5F9] text-xs font-semibold text-[#0B1F33] outline-none border border-slate-200 focus:border-premium-gold focus:ring-2 focus:ring-premium-gold/20 rounded-xl transition-all leading-none"
                        aria-label="Work Email Address"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-premium-gold hover:bg-[#B38E3F] text-white text-xs font-bold uppercase tracking-widest active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all border-none rounded-xl mt-2 shadow-md flex items-center justify-center cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        Sending Reset Link...
                      </>
                    ) : (
                      'Request Recovery Link'
                    )}
                  </button>
                </form>
              </>
            )}

            {/* VIEW 3: RESET PASSWORD FORM */}
            {view === 'reset' && (
              <>
                <div className="space-y-1">
                  <h2 className="text-base font-display font-bold text-primary-navy">Set New Password</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Establish your new system access credentials to protect your secure account profile.</p>
                </div>

                {localError && (
                  <div className="p-3 rounded-xl bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold flex items-start space-x-2 animate-fade-in" role="alert">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <span>{localError}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="p-3 rounded-xl bg-green-50 text-green-700 border border-green-100 text-[10px] font-bold flex items-start space-x-2 animate-fade-in" role="status">
                    <CheckCircle className="w-4 h-4 shrink-0 text-green-600 mt-0.5" />
                    <span>{successMessage}</span>
                  </div>
                )}

                <form onSubmit={handleResetSubmit} className="space-y-4">
                  {/* New Password Input */}
                  <div className="space-y-1">
                    <label htmlFor="new-password-input" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      New Password (minimum 6 chars)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                        <Lock className="w-4 h-4 text-slate-400" />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="new-password-input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onKeyUp={checkCapsLock}
                        onKeyDown={checkCapsLock}
                        placeholder="••••••••"
                        required
                        className="w-full pl-10 pr-10 h-11 bg-[#F1F5F9] text-xs font-semibold text-[#0B1F33] outline-none border border-slate-200 focus:border-premium-gold focus:ring-2 focus:ring-premium-gold/20 rounded-xl transition-all leading-none"
                        aria-label="New Password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password Input */}
                  <div className="space-y-1">
                    <label htmlFor="confirm-password-input" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                        <Lock className="w-4 h-4 text-slate-400" />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="confirm-password-input"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-10 pr-4 h-11 bg-[#F1F5F9] text-xs font-semibold text-[#0B1F33] outline-none border border-slate-200 focus:border-premium-gold focus:ring-2 focus:ring-premium-gold/20 rounded-xl transition-all leading-none"
                        aria-label="Confirm New Password"
                      />
                    </div>
                    
                    {isCapsLockOn && (
                      <div className="text-[9px] text-amber-600 font-semibold flex items-center space-x-1 mt-1 animate-pulse">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        <span>Caps Lock is ON</span>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-premium-gold hover:bg-[#B38E3F] text-white text-xs font-bold uppercase tracking-widest active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all border-none rounded-xl mt-2 shadow-md flex items-center justify-center cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        Updating Password...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setLocalError(null); setSuccessMessage(null); setView('login'); }}
                    className="w-full text-center text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase transition-all bg-transparent border-none mt-2 cursor-pointer block"
                  >
                    Cancel and Return to Login
                  </button>
                </form>
              </>
            )}

          </div>
        </div>

        {/* Elegant Footer with Version Information and copyright */}
        <div className="text-center space-y-1.5 mt-8 shrink-0">
          <p className="text-[10px] text-slate-400">
            © 2026 ImCRM Enterprise Systems.
          </p>
          <div className="flex justify-center items-center space-x-2 text-[9px] font-mono text-slate-400">
            <span className="bg-slate-200 px-2 py-0.5 rounded-md font-bold text-slate-500">v1.0.0</span>
            <span className="bg-slate-200 px-2 py-0.5 rounded-md font-bold text-slate-500">Build 20260626</span>
            <span className="bg-[#E2E8F0] text-[#0F172A] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider scale-[0.9]">Production</span>
          </div>
        </div>

      </div>
    </div>
  );
}
