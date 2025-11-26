"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { WikiPage } from '../../types';

interface PagesContextType {
  pages: WikiPage[];
  setPages: React.Dispatch<React.SetStateAction<WikiPage[]>>;
  refreshPages: () => Promise<void>;
}

const PagesContext = createContext<PagesContextType | undefined>(undefined);

export function PagesProvider({ children }: { children: ReactNode }) {
  const [pages, setPages] = useState<WikiPage[]>([]);

  const refreshPages = async () => {
    // TODO: Implement page refresh logic
  };

  return (
    <PagesContext.Provider value={{ pages, setPages, refreshPages }}>
      {children}
    </PagesContext.Provider>
  );
}

export function usePages() {
  const context = useContext(PagesContext);
  if (context === undefined) {
    throw new Error('usePages must be used within a PagesProvider');
  }
  return context;
}
