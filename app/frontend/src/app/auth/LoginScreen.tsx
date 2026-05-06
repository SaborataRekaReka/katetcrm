import { FormEvent, useState } from 'react';
import { useAuth } from './AuthProvider';

/**
 * Минимальный экран входа для Stage 2.
 * Показывается только если в localStorage нет валидного access-токена.
 * Визуально намеренно скромный: доработка дизайна — post-MVP.
 */
export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@katet.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white rounded-xl shadow-md border border-gray-200 p-6 space-y-4"
      >
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Katet CRM</h1>
          <p className="text-sm text-gray-500 mt-1">Вход в систему</p>
        </div>
        <label className="block">
          <span className="text-sm text-gray-700">Эл. почта</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-700">Пароль</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full inline-flex justify-center items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? 'Вход…' : 'Войти'}
        </button>
        <div className="text-xs text-gray-500">
          Тестовые аккаунты: <br />
          admin@katet.local / admin123 <br />
          manager@katet.local / manager123
        </div>
      </form>
    </div>
  );
}
