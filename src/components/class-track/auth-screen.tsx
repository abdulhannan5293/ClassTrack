'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  GraduationCap,
  Mail,
  Key,
  ArrowRight,
  Loader2,
  ClipboardCheck,
  BarChart3,
  CheckCircle2,
  Sparkles,
  Shield,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';

import { useAuthStore } from '@/stores/auth-store';
import { useNavStore } from '@/stores/nav-store';

const EMAIL_REGEX = /^(\d{4})([a-zA-Z]+)(\d{1,3})@uni\.edu\.pk$/i;

// ── Floating Orbs Background ──────────────────────────────────────

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Amber orb - top left */}
      <motion.div
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-amber-400/15 dark:bg-amber-500/10 blur-3xl"
      />
      {/* Teal orb - bottom right */}
      <motion.div
        animate={{
          x: [0, -25, 35, 0],
          y: [0, 30, -25, 0],
          scale: [1, 0.9, 1.15, 1],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-teal-400/12 dark:bg-teal-500/8 blur-3xl"
      />
      {/* Small orange orb - center right */}
      <motion.div
        animate={{
          x: [0, 15, -10, 0],
          y: [0, -15, 10, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/3 right-0 w-32 h-32 rounded-full bg-orange-400/10 dark:bg-orange-500/6 blur-2xl"
      />
      {/* Small rose orb - center left */}
      <motion.div
        animate={{
          x: [0, -10, 15, 0],
          y: [0, 20, -15, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-1/3 left-0 w-24 h-24 rounded-full bg-rose-400/8 dark:bg-rose-500/5 blur-2xl"
      />
    </div>
  );
}

// ── Typing Indicator ──────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center justify-center gap-1.5 py-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
          className="size-2 rounded-full bg-amber-500"
        />
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────

export function AuthScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [error, setError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const { setAuth } = useAuthStore();
  const navigate = useNavStore((s) => s.navigate);

  const validateEmail = useCallback((value: string): boolean => {
    return EMAIL_REGEX.test(value);
  }, []);

  const handleSendOtp = useCallback(async () => {
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Invalid email format. Use format: 2023ce45@uni.edu.pk');
      return;
    }

    if (cooldown > 0) {
      setError(`Please wait ${cooldown} seconds before requesting another code.`);
      return;
    }

    setSendingOtp(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send OTP. Please try again.');
        return;
      }

      // Show the OTP in a toast since we can't send real emails
      toast.success(`Your OTP is: ${data.otp}`, {
        duration: 30000,
        description: 'This toast serves as your OTP delivery for demo purposes.',
      });

      // Start cooldown timer for rate limiting
      setCooldown(30);
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setStep('otp');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSendingOtp(false);
    }
  }, [email, validateEmail]);

  const handleVerify = useCallback(async () => {
    setError('');

    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit OTP.');
      return;
    }

    setVerifying(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid OTP. Please try again.');
        return;
      }

      // On success, store auth data and navigate to dashboard
      setAuth(
        data.user,
        data.accessToken,
        data.refreshToken
      );
      navigate('dashboard');

      toast.success('Welcome to ClassTrack!');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setVerifying(false);
    }
  }, [email, otp, setAuth, navigate]);

  const handleResend = useCallback(() => {
    setStep('email');
    setOtp('');
    setError('');
  }, []);

  const emailValid = email.trim() !== '' && validateEmail(email);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 auth-gradient-bg relative overflow-hidden">
      {/* Floating Orbs */}
      <FloatingOrbs />

      {/* Dot pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Glow ring behind card */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400/20 via-orange-400/10 to-teal-400/15 blur-xl -z-10 scale-[0.95] opacity-60" aria-hidden="true" />

        <Card className="border-0 shadow-xl glass-card relative overflow-hidden">
          {/* Top gradient accent stripe */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-teal-400" />

          <CardHeader className="items-center text-center gap-2 pb-2 pt-6">
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, duration: 0.3, ease: 'easeOut' }}
              className="relative"
            >
              {/* Animated gradient ring behind icon */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-400 to-teal-400 opacity-20 blur-sm"
                style={{ padding: '2px' }}
              />
              <div className="relative flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/15">
                <GraduationCap className="size-8 text-amber-600 dark:text-amber-400" />
              </div>
            </motion.div>
            <CardTitle className="text-2xl font-extrabold tracking-wide mt-1 text-gradient-amber">
              ClassTrack
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              University Classroom Management
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            <AnimatePresence mode="wait">
              {step === 'email' ? (
                <motion.div
                  key="email-step"
                  initial={{ opacity: 0, x: -30, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, x: 30, filter: 'blur(4px)' }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
                      <div className="flex items-center justify-center size-5 rounded-md bg-amber-100 dark:bg-amber-900/30">
                        <Mail className="size-3 text-amber-600 dark:text-amber-400" />
                      </div>
                      University Email
                    </Label>
                    <motion.div whileFocusWithin={{ scale: 1.01 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
                      <Input
                        id="email"
                        type="email"
                        placeholder="2023ce45@uni.edu.pk"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error) setError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendOtp();
                        }}
                        autoComplete="email"
                        aria-invalid={!!error}
                        className={`text-base h-12 rounded-xl border-l-[3px] pl-5 transition-all duration-200 bg-background/80 backdrop-blur-sm input-glow ${
                          error
                            ? 'border-l-destructive focus-visible:border-l-destructive focus-visible:ring-destructive/20 input-error input-error-shake'
                            : emailValid
                              ? 'border-l-emerald-500 focus-visible:border-l-emerald-500 focus-visible:ring-emerald-500/20 shadow-sm shadow-emerald-500/5'
                              : 'border-l-transparent focus-visible:border-l-amber-500 focus-visible:ring-amber-500/20'
                        }`}
                      />
                    </motion.div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Format: {`<year><dept><roll>@uni.edu.pk`}
                      </p>
                      {emailValid && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium"
                        >
                          <CheckCircle2 className="size-3" />
                          Valid format
                        </motion.span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="otp-step"
                  initial={{ opacity: 0, x: 30, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, x: -30, filter: 'blur(4px)' }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <div className="flex items-center justify-center size-5 rounded-md bg-amber-100 dark:bg-amber-900/30">
                        <Key className="size-3 text-amber-600 dark:text-amber-400" />
                      </div>
                      Verification Code
                    </Label>
                    <div className="flex items-center gap-2 bg-muted/50 dark:bg-muted/30 rounded-lg px-3 py-2 text-xs text-muted-foreground">
                      <Mail className="size-3 shrink-0" />
                      <span className="truncate">{email}</span>
                    </div>
                  </div>

                  <div className="flex justify-center py-2">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(value) => {
                        setOtp(value);
                        if (error) setError('');
                      }}
                      onComplete={handleVerify}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} className="h-12 w-12 rounded-lg text-lg" />
                        <InputOTPSlot index={1} className="h-12 w-12 rounded-lg text-lg" />
                        <InputOTPSlot index={2} className="h-12 w-12 rounded-lg text-lg" />
                      </InputOTPGroup>
                      <InputOTPSeparator className="mx-2" />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} className="h-12 w-12 rounded-lg text-lg" />
                        <InputOTPSlot index={4} className="h-12 w-12 rounded-lg text-lg" />
                        <InputOTPSlot index={5} className="h-12 w-12 rounded-lg text-lg" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground hover:text-foreground rounded-lg"
                      onClick={handleResend}
                    >
                      Change email address
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="mt-3"
                >
                  <div className="flex items-center gap-2 text-sm text-destructive text-center bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
                    <span className="shrink-0">⚠</span>
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Typing indicator when sending OTP */}
            <AnimatePresence>
              {sendingOtp && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-2"
                >
                  <p className="text-xs text-center text-muted-foreground mb-1">Sending verification code...</p>
                  <TypingDots />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>

          <CardFooter className="flex-col gap-4 pt-0 pb-6">
            {step === 'email' ? (
              <motion.div
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="w-full"
              >
                <Button
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white shadow-lg shadow-amber-500/25 font-semibold text-sm transition-all duration-200 hover:shadow-xl hover:shadow-amber-500/30"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || !emailValid}
                >
                  {sendingOtp ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Send Verification Code
                      <ArrowRight className="size-4" />
                    </span>
                  )}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="w-full"
              >
                <Button
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white shadow-lg shadow-amber-500/25 font-semibold text-sm transition-all duration-200 hover:shadow-xl hover:shadow-amber-500/30 disabled:opacity-50"
                  onClick={handleVerify}
                  disabled={verifying || otp.length !== 6}
                >
                  {verifying ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Verify & Login
                      <ArrowRight className="size-4" />
                    </span>
                  )}
                </Button>
              </motion.div>
            )}

            <p className="text-xs text-muted-foreground/70 text-center leading-relaxed">
              By continuing, you agree to our{' '}
              <span className="text-foreground/80 underline-offset-2 hover:underline cursor-pointer">Terms of Service</span>
              {' '}and{' '}
              <span className="text-foreground/80 underline-offset-2 hover:underline cursor-pointer">Privacy Policy</span>
            </p>
          </CardFooter>
        </Card>

        {/* Feature list below card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-4 mt-10"
        >
          <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
            {[
              { icon: ClipboardCheck, label: 'Attendance', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
              { icon: BarChart3, label: 'GPA Calc', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' },
              { icon: Sparkles, label: 'Results', color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/30' },
            ].map((feature, i) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1, duration: 0.4 }}
                className="flex flex-col items-center gap-1.5"
              >
                <div className={`flex items-center justify-center size-9 rounded-xl ${feature.color}`}>
                  <feature.icon className="size-4" />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">{feature.label}</span>
              </motion.div>
            ))}
          </div>

          {/* Brand footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="flex flex-col items-center gap-1.5 mt-2"
          >
            <div className="flex items-center gap-1.5 text-muted-foreground/50">
              <Shield className="size-3" />
              <span className="text-[10px] font-medium">Secure & Private</span>
            </div>
            <p className="text-[10px] text-muted-foreground/40 text-center">
              &copy; {new Date().getFullYear()} ClassTrack &middot; Built for students, by students
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
