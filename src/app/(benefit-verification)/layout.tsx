import React from 'react';
import { BenefitVerificationProvider } from '@/contexts/BenefitVerificationContext';

interface BenefitVerificationLayoutProps {
  children: React.ReactNode;
}

export default function BenefitVerificationLayout({ children }: BenefitVerificationLayoutProps) {
  // This layout wraps all pages within the (benefit-verification) route group
  // It applies the context provider so all steps share the same verification state.
  return (
    <BenefitVerificationProvider>
      {/* We could add a shared wrapper/styling for the verification flow here if needed */}
      {children}
    </BenefitVerificationProvider>
  );
} 