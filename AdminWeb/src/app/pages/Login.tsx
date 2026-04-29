import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { ShieldAlert, ArrowRight, Lock, User, KeyRound, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '../components/ui/input-otp';

export default function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  const login = useAuthStore((state) => state.login);
  const verifyOtp = useAuthStore((state) => state.verifyOtp);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (result?.requireOtp) {
        setStep('otp');
        toast.info('Mã OTP đã được gửi đến email của bạn');
      } else if (result?.success) {
        toast.success('Đăng nhập thành công');
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      toast.error('Vui lòng nhập đủ 6 số OTP');
      return;
    }
    
    setIsLoading(true);
    try {
      await verifyOtp(email, otp);
      toast.success('Xác thực thiết bị thành công');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Xác thực OTP thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-destructive/10 blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md p-6 sm:p-8 relative z-10"
      >
        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            {step === 'login' ? (
              <motion.div
                key="login-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex flex-col items-center mb-8 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-5 border border-primary/20 shadow-inner">
                    <ShieldAlert className="w-8 h-8 text-primary" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">SafeLink Admin</h1>
                  <p className="text-muted-foreground mt-2 text-sm">Đăng nhập vào hệ thống quản trị trung tâm</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">Tài khoản</Label>
                    <div className="relative group">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input 
                        id="email" 
                        type="text" 
                        placeholder="admin@safelink.vn" 
                        className="pl-11 h-12 rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary/50 transition-all"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Mật khẩu</Label>
                      <a href="#" className="text-sm text-primary hover:text-primary/80 transition-colors font-medium">
                        Quên mật khẩu?
                      </a>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input 
                        id="password" 
                        type="password" 
                        placeholder="••••••••" 
                        className="pl-11 h-12 rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary/50 transition-all"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-1 pb-3">
                    <Checkbox id="remember" className="rounded-[4px] data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                    <label
                      htmlFor="remember"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none"
                    >
                      Ghi nhớ phiên đăng nhập
                    </label>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-xl font-medium text-[15px] transition-all group overflow-hidden relative shadow-lg shadow-primary/25"
                    disabled={isLoading}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      ) : (
                        <>
                          Đăng nhập hệ thống
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </span>
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="otp-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex flex-col items-center mb-8 text-center">
                  <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-5 border border-blue-500/20 shadow-inner">
                    <KeyRound className="w-8 h-8 text-blue-500" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Xác thực thiết bị mới</h1>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    Vui lòng nhập mã OTP gồm 6 chữ số vừa được gửi đến<br/> 
                    <span className="font-semibold text-foreground">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-6 flex flex-col items-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp} disabled={isLoading}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="w-12 h-14 text-lg" />
                      <InputOTPSlot index={1} className="w-12 h-14 text-lg" />
                      <InputOTPSlot index={2} className="w-12 h-14 text-lg" />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} className="w-12 h-14 text-lg" />
                      <InputOTPSlot index={4} className="w-12 h-14 text-lg" />
                      <InputOTPSlot index={5} className="w-12 h-14 text-lg" />
                    </InputOTPGroup>
                  </InputOTP>

                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-xl font-medium text-[15px] transition-all"
                    disabled={isLoading || otp.length < 6}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      'Xác nhận đăng nhập'
                    )}
                  </Button>

                  <button 
                    type="button" 
                    onClick={() => {
                      setStep('login');
                      setOtp('');
                    }}
                    className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
                    disabled={isLoading}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Quay lại đăng nhập
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground font-medium">
              © {new Date().getFullYear()} SafeLink Platform. All rights reserved.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
