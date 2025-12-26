'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

// Lock screen background video options
const BACKGROUND_VIDEOS: Record<string, string> = {
  'ocean-waves': '/1918465-hd_1920_1080_24fps.mp4',
  underwater: '/10109224-hd_1920_1080_24fps.mp4',
  jellyfish: '/12008759_1920_1080_30fps.mp4',
  'coral-reef': '/5358852-hd_1920_1080_25fps.mp4',
  'deep-blue': '/19924824-hd_1920_1080_30fps.mp4',
  'sea-turtle': '/17799961-hd_1920_1080_25fps.mp4',
};

const DEFAULT_VIDEO = 'ocean-waves';
const LOCK_SCREEN_BG_KEY = 'anchor-lock-screen-bg';

// Custom Anchor icon with refined design
function AnchorIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="5" r="2.5" />
      <line x1="12" y1="7.5" x2="12" y2="21" />
      <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
      <path d="M12 21a8 8 0 0 1-8-8" />
      <path d="M12 21a8 8 0 0 0 8-8" />
    </svg>
  );
}

export function LockScreen() {
  const { t } = useTranslation();
  const { login, isLoading: authLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [videoUrl, setVideoUrl] = useState(BACKGROUND_VIDEOS[DEFAULT_VIDEO]);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load selected background and auto-focus input
  useEffect(() => {
    // Load saved background preference
    const savedBg = localStorage.getItem(LOCK_SCREEN_BG_KEY);
    if (savedBg && BACKGROUND_VIDEOS[savedBg]) {
      setVideoUrl(BACKGROUND_VIDEOS[savedBg]);
    }

    // Auto-focus input after mount
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isUnlocking) return;

    setIsSubmitting(true);
    setError(null);

    const result = await login(password);

    if (!result.success) {
      setError(result.message);
      setPassword('');
      // Shake animation trigger
      inputRef.current?.classList.add('animate-shake');
      setTimeout(() => {
        inputRef.current?.classList.remove('animate-shake');
      }, 500);
      setIsSubmitting(false);
    } else {
      // Success! Trigger unlock animation
      setIsUnlocking(true);
      // Keep submitting state so button shows loading
    }
  };

  if (authLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c1821]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-b from-white/10 to-transparent flex items-center justify-center">
              <AnchorIcon className="w-10 h-10 text-white/80" />
            </div>
            <div
              className="absolute inset-0 rounded-full border border-white/20 animate-ping"
              style={{ animationDuration: '2s' }}
            />
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse"
              style={{ animationDelay: '0ms' }}
            />
            <div
              className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse"
              style={{ animationDelay: '150ms' }}
            />
            <div
              className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center overflow-hidden',
        'transition-all duration-300 ease-out',
        isUnlocking && 'opacity-0 scale-105 blur-lg'
      )}
    >
      {/* Video Background */}
      <video
        key={videoUrl}
        autoPlay
        muted
        loop
        playsInline
        onLoadedData={() => setVideoLoaded(true)}
        className={cn(
          'absolute inset-0 w-full h-full object-cover transition-all duration-[2000ms]',
          videoLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110',
          isUnlocking && 'scale-110'
        )}
      >
        <source src={videoUrl} type="video/mp4" />
      </video>

      {/* Subtle gradient overlay - mimics natural light */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

      {/* Vignette effect */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.3) 100%)',
        }}
      />

      {/* Content Container */}
      <div
        className={cn(
          'relative z-10 w-full max-w-[340px] mx-4',
          'transition-all duration-300 ease-out',
          isUnlocking && 'translate-y-[-20px] opacity-0 scale-95'
        )}
      >
        {/* Logo & Title - Floating above card */}
        <div
          className={cn(
            'text-center mb-8 animate-fade-in-up',
            'transition-all duration-250 ease-out',
            isUnlocking && 'translate-y-[-15px] opacity-0'
          )}
          style={{ animationDelay: '200ms' }}
        >
          <div
            className={cn(
              'inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 mb-5 shadow-2xl',
              'transition-all duration-300 ease-out',
              isUnlocking && 'scale-125 opacity-0'
            )}
          >
            <AnchorIcon className="w-9 h-9 text-white drop-shadow-lg" />
          </div>
          <h1 className="text-[28px] font-semibold text-white tracking-tight drop-shadow-lg">
            Anchor OS
          </h1>
        </div>

        {/* Glass Card */}
        <div
          className={cn(
            'backdrop-blur-2xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl overflow-hidden animate-fade-in-up',
            'transition-all duration-250 ease-out',
            isUnlocking && 'translate-y-[10px] opacity-0 scale-95'
          )}
          style={{
            animationDelay: '400ms',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          {/* Form */}
          <form onSubmit={handleSubmit} className="p-7" autoComplete="off" data-form-type="other">
            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3.5 rounded-2xl bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-center animate-fade-in">
                <p className="text-[13px] text-red-200 font-medium">{error}</p>
              </div>
            )}

            {/* Password Field */}
            <div className="mb-5">
              <label className="block text-[13px] font-medium text-white/70 mb-2.5 ml-1">
                {t('lockScreen.password')}
              </label>
              <div
                className={cn(
                  'relative rounded-2xl transition-all duration-300',
                  isFocused && 'ring-2 ring-white/30'
                )}
              >
                {/* Hidden dummy field to confuse password managers */}
                <input
                  type="password"
                  name="fake-password-field"
                  autoComplete="new-password"
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    pointerEvents: 'none',
                    width: 0,
                    height: 0,
                  }}
                  tabIndex={-1}
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={(e) => {
                    setIsFocused(true);
                    e.target.removeAttribute('readonly');
                  }}
                  onBlur={() => setIsFocused(false)}
                  disabled={isUnlocking}
                  readOnly
                  className="w-full px-5 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 text-white text-[16px] placeholder-white/30 focus:outline-none focus:bg-white/15 focus:border-white/20 transition-all duration-300 disabled:opacity-50"
                  placeholder={t('lockScreen.placeholder')}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  style={
                    {
                      WebkitTextSecurity: showPassword ? 'none' : 'disc',
                    } as React.CSSProperties
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isUnlocking}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-white/40 hover:text-white/70 hover:bg-white/10 transition-all duration-200 disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff className="w-[18px] h-[18px]" />
                  ) : (
                    <Eye className="w-[18px] h-[18px]" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !password.trim() || isUnlocking}
              className={cn(
                'w-full py-4 rounded-2xl font-semibold text-[15px] transition-all duration-300',
                'bg-white text-[#0c1821]',
                'hover:bg-white/90 active:scale-[0.98]',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:active:scale-100',
                'flex items-center justify-center gap-2.5',
                'shadow-lg shadow-white/20',
                isUnlocking && '!bg-green-500 !text-white !opacity-100'
              )}
            >
              {isSubmitting || isUnlocking ? (
                <>
                  {isUnlocking ? (
                    <svg
                      className="w-5 h-5 animate-pulse"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <Loader2 className="w-[18px] h-[18px] animate-spin" />
                  )}
                  <span>
                    {isUnlocking ? t('lockScreen.welcome', 'Welcome!') : t('lockScreen.unlocking')}
                  </span>
                </>
              ) : (
                <span>{t('lockScreen.unlock')}</span>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="px-7 pb-6 pt-1">
            <p className="text-[11px] text-center text-white/40">{t('lockScreen.protected')}</p>
          </div>
        </div>

        {/* Branding */}
        <div
          className={cn(
            'mt-8 text-center animate-fade-in-up',
            'transition-all duration-200 ease-out',
            isUnlocking && 'opacity-0'
          )}
          style={{ animationDelay: '600ms' }}
        >
          <p className="text-[11px] text-white/40 tracking-wide">{t('lockScreen.poweredBy')}</p>
        </div>
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          10%,
          30%,
          50%,
          70%,
          90% {
            transform: translateX(-4px);
          }
          20%,
          40%,
          60%,
          80% {
            transform: translateX(4px);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.7s ease-out forwards;
          opacity: 0;
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
