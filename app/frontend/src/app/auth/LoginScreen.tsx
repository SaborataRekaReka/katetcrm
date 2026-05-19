import { FormEvent, useState } from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

/**
 * Минимальный экран входа для Stage 2.
 * Показывается только если в localStorage нет валидного access-токена.
 * Визуально намеренно скромный: доработка дизайна — post-MVP.
 */
export function LoginScreen() {
  const { login } = useAuth();
  const showDemoAccounts = import.meta.env.DEV;
  const [email, setEmail] = useState(showDemoAccounts ? 'admin@katet.local' : '');
  const [password, setPassword] = useState(showDemoAccounts ? 'admin123' : '');
  const [error, setError] = useState<string | null>(null);
  const [showPasswordHelp, setShowPasswordHelp] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--shell-app-bg)] p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Katet CRM</CardTitle>
            <CardDescription className="text-sm">Вход в систему</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Эл. почта</Label>
              <Input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login-password">Пароль</Label>
              <Input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error ? (
              <Alert variant="destructive" className="border-destructive/30">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? 'Вход…' : 'Войти'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowPasswordHelp((value) => !value)}
              className="w-full text-xs"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Забыли пароль?
            </Button>

            {showPasswordHelp ? (
              <Alert className="border-border/70 bg-muted/30">
                <AlertDescription className="text-xs">
                  Обратитесь к администратору CRM: он выдаст новый временный пароль. Автоматическая отправка писем сейчас не включена.
                </AlertDescription>
              </Alert>
            ) : null}

            {showDemoAccounts ? (
              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Тестовые аккаунты: <br />
                admin@katet.local / admin123 <br />
                manager@katet.local / manager123
              </div>
            ) : null}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
