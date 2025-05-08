'use client';

import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

interface LoadingContextProps {
  isLoadingPage: boolean;
  setIsLoadingPage: Dispatch<SetStateAction<boolean>>;
}

const LoadingContext = createContext<LoadingContextProps | undefined>(undefined);

export const LoadingProvider = ({ children }: { children: ReactNode }) => {
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  return (
    <LoadingContext.Provider value={{ isLoadingPage, setIsLoadingPage }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const usePageLoading = (): LoadingContextProps => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('usePageLoading must be used within a LoadingProvider');
  }
  return context;
}; 