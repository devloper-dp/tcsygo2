import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, User, Phone, ArrowLeft } from 'lucide-react';

export default function Signup() {
  const [, navigate] = useLocation();
  const { signUp } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({
        title: 'Invalid password',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await signUp(email, password, fullName, phone);
      toast({
        title: 'Account created!',
        description: 'Welcome to TCSYGO. Please check your email for verification.',
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Signup failed',
        description: error.message || 'Unable to create account',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      {/* Left Panel: Branding/Hero */}
      <div className="hidden lg:flex flex-col justify-between bg-primary p-10 text-primary-foreground">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <span className="font-bold text-lg">T</span>
          </div>
          <span className="text-xl font-display font-bold">TCSYGO</span>
        </div>

        <div>
          <h2 className="text-4xl font-display font-bold mb-4">
            Start your journey<br />with us today.
          </h2>
          <p className="text-primary-foreground/80 text-lg max-w-md">
            Create an account to begin carpooling, saving money, and reducing your carbon footprint.
          </p>
        </div>

        <div className="text-sm text-primary-foreground/60">
          &copy; {new Date().getFullYear()} TCSYGO. All rights reserved.
        </div>
      </div>

      {/* Right Panel: Signup Form */}
      <div className="flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center lg:text-left">
            <Button
              variant="ghost"
              className="absolute top-4 right-4 lg:hidden"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <h1 className="text-3xl font-display font-bold tracking-tight">Create an account</h1>
            <p className="text-muted-foreground mt-2">
              Enter your details to register
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="pl-10 h-11"
                  required
                  data-testid="input-fullname"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="pl-10 h-11"
                  required
                  data-testid="input-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="pl-10 h-11"
                  data-testid="input-phone"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 h-11"
                  required
                  data-testid="input-password"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters long
              </p>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-11"
              disabled={loading}
              data-testid="button-submit-signup"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="text-center text-sm">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="font-medium text-primary hover:underline"
              data-testid="link-login"
            >
              Log in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
