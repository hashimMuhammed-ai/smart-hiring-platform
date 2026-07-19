import type { Metadata } from 'next';
import RegisterForm from './RegisterForm';

export const metadata: Metadata = {
  title: 'Create workspace — SmartHire',
  description: 'Create your SmartHire workspace and start hiring smarter with AI-powered candidate matching.',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
