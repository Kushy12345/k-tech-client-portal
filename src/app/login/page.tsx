import { AuthForm } from '@/components/auth/auth-form';

export default function LoginPage({ searchParams }: { searchParams: { error?: string; redirect?: string } }) {
  const error = searchParams.error === 'confirmation'
    ? 'That confirmation link is invalid or has expired. Please request a new account confirmation email.'
    : undefined;
  return <main className="flex min-h-screen items-center justify-center px-6 py-16"><AuthForm mode="login" initialError={error} redirectPath={searchParams.redirect} /></main>;
}
