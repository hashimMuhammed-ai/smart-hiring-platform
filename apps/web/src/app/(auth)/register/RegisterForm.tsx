'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';
import { registerSchema, type RegisterFormValues } from '@/lib/schemas/auth.schema';

interface RegisterResponse {
  accessToken: string;
  userId: string;
  tenantId: string;
}

export default function RegisterForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues): Promise<void> => {
    setServerError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...payload } = values;
      void confirmPassword; // excluded from API payload intentionally
      const res = await apiClient.post<RegisterResponse>('/auth/register', payload);
      setAuth(res.data.accessToken, {
        id: res.data.userId,
        email: values.email,
        role: 'admin',
      });
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
        setServerError('Registration failed. Please try again.');
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
        <h1 className="auth-card-title">Create your workspace</h1>
        <p className="auth-card-subtitle">Start hiring smarter today</p>
      </div>

      <form id="register-form" onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
        {serverError && (
          <div className="form-error-banner" role="alert">
            {serverError}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="register-tenant" className="form-label">
            Company name
          </label>
          <input
            id="register-tenant"
            type="text"
            autoComplete="organization"
            className={`form-input ${errors.tenantName ? 'form-input--error' : ''}`}
            placeholder="Acme Corp"
            {...register('tenantName')}
          />
          {errors.tenantName && (
            <p className="form-field-error">{errors.tenantName.message}</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="register-email" className="form-label">
            Work email
          </label>
          <input
            id="register-email"
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
          <label htmlFor="register-password" className="form-label">
            Password
          </label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            className={`form-input ${errors.password ? 'form-input--error' : ''}`}
            placeholder="Min. 6 characters"
            {...register('password')}
          />
          {errors.password && (
            <p className="form-field-error">{errors.password.message}</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="register-confirm-password" className="form-label">
            Confirm password
          </label>
          <input
            id="register-confirm-password"
            type="password"
            autoComplete="new-password"
            className={`form-input ${errors.confirmPassword ? 'form-input--error' : ''}`}
            placeholder="Repeat your password"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="form-field-error">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          id="register-submit"
          type="submit"
          disabled={isSubmitting}
          className="btn-primary"
        >
          {isSubmitting ? (
            <span className="btn-spinner" aria-hidden="true" />
          ) : null}
          {isSubmitting ? 'Creating workspace…' : 'Create workspace'}
        </button>
      </form>

      <p className="auth-card-footer">
        Already have an account?{' '}
        <Link href="/login" className="auth-link">
          Sign in
        </Link>
      </p>
    </div>
  );
}
