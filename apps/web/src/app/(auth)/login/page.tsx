import type { Metadata } from 'next';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign in — SmartHire',
  description: 'Sign in to your SmartHire workspace to manage jobs, candidates, and hiring pipelines.',
};

export default function LoginPage() {
  return <LoginForm />;
}
