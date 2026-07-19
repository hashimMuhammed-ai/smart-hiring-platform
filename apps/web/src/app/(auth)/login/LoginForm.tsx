'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';
import { loginSchema, type LoginFormValues } from '@/lib/schemas/auth.schema';
import type { AuthUser } from '@/store/auth';

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export default function LoginForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    setServerError(null);
    try {
      const res = await apiClient.post<LoginResponse>('/auth/login', values);
      setAuth(res.data.accessToken, res.data.user);
      router.push('/');
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
      ) {
        setServerError(
          (err as { response: { data: { message: string } } }).response.data.message,
        );
      } else {
        setServerError('Invalid email or password. Please try again.');
      }
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-card-header">
        <Image
          src="/logo.png"
          alt="SmartHire Logo"
          width={48}
          height={48}
          className="auth-brand-logo"
          priority
        />
        <h1 className="auth-card-title">Welcome back</h1>
        <p className="auth-card-subtitle">Sign in to your workspace</p>
      </div>

      <form id="login-form" onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
        {serverError && (
          <div className="form-error-banner" role="alert">
            {serverError}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="login-email" className="form-label">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            className={`form-input ${errors.email ? 'form-input--error' : ''}`}
            placeholder="you@company.com"
            {...register('email')}
          />
          {errors.email && (
            <p className="form-field-error">{errors.email.message}</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="login-password" className="form-label">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            className={`form-input ${errors.password ? 'form-input--error' : ''}`}
            placeholder="••••••••"
            {...register('password')}
          />
          {errors.password && (
            <p className="form-field-error">{errors.password.message}</p>
          )}
        </div>

        <button
          id="login-submit"
          type="submit"
          disabled={isSubmitting}
          className="btn-primary"
        >
          {isSubmitting ? (
            <span className="btn-spinner" aria-hidden="true" />
          ) : null}
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="auth-card-footer">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="auth-link">
          Create workspace
        </Link>
      </p>
    </div>
  );
}
