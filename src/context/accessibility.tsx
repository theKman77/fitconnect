import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './auth';

interface A11y {
  largeText: boolean;
  highContrast: boolean;
}

const A11yContext = createContext<A11y>({ largeText: false, highContrast: false });

/** Exposes the user's saved accessibility preferences to every Txt render. */
export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  return (
    <A11yContext.Provider
      value={{ largeText: !!profile?.large_text, highContrast: !!profile?.high_contrast }}
    >
      {children}
    </A11yContext.Provider>
  );
}

export function useAccessibility(): A11y {
  return useContext(A11yContext);
}
