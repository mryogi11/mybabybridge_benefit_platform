'use client';

import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

// Define the shape of the context state
interface BenefitVerificationState {
  benefitSource: string | null;
  sponsoringOrganizationId: string | null;
  sponsoringOrganizationName: string | null; // Optional: Store name for display
  benefitStatus: string | null; // Add benefit status
  // Add other fields as needed, e.g., personal info, verification attempt ID
}

// Define the shape of the context value, including state and setters
interface BenefitVerificationContextProps extends BenefitVerificationState {
  setBenefitSource: Dispatch<SetStateAction<string | null>>;
  setSponsoringOrganization: (id: string | null, name?: string | null) => void;
  setBenefitStatus: Dispatch<SetStateAction<string | null>>; // Add setter for status
}

// Create the context with a default value
const BenefitVerificationContext = createContext<BenefitVerificationContextProps | undefined>(undefined);

// Create the provider component
interface BenefitVerificationProviderProps {
  children: ReactNode;
}

export const BenefitVerificationProvider: React.FC<BenefitVerificationProviderProps> = ({ children }) => {
  const [benefitSource, setBenefitSource] = useState<string | null>(null);
  const [sponsoringOrganizationId, setSponsoringOrganizationId] = useState<string | null>(null);
  const [sponsoringOrganizationName, setSponsoringOrganizationName] = useState<string | null>(null);
  const [benefitStatus, setBenefitStatus] = useState<string | null>(null); // Add status state

  const setSponsoringOrganization = (id: string | null, name: string | null = null) => {
    setSponsoringOrganizationId(id);
    setSponsoringOrganizationName(name);
  };

  const value = {
    benefitSource,
    sponsoringOrganizationId,
    sponsoringOrganizationName,
    benefitStatus, // Add status to value
    setBenefitSource,
    setSponsoringOrganization,
    setBenefitStatus, // Add setter to value
  };

  return (
    <BenefitVerificationContext.Provider value={value}>
      {children}
    </BenefitVerificationContext.Provider>
  );
};

// Create a custom hook for easy context consumption
export const useBenefitVerification = (): BenefitVerificationContextProps => {
  const context = useContext(BenefitVerificationContext);
  if (context === undefined) {
    throw new Error('useBenefitVerification must be used within a BenefitVerificationProvider');
  }
  return context;
}; 