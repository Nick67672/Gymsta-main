import React, { createContext, useContext, useRef, useCallback } from 'react';
import { FlashList } from '@shopify/flash-list';

interface HomeScreenContextType {
  listRef: React.RefObject<FlashList<any>>;
  scrollToTop: () => void;
  refreshFeed: () => void;
  scrollToTopAndRefresh: () => void;
  setRefreshFunction: (fn: () => void) => void;
}

const HomeScreenContext = createContext<HomeScreenContextType | undefined>(undefined);

export const useHomeScreen = () => {
  const context = useContext(HomeScreenContext);
  if (!context) {
    throw new Error('useHomeScreen must be used within a HomeScreenProvider');
  }
  return context;
};

interface HomeScreenProviderProps {
  children: React.ReactNode;
}

export const HomeScreenProvider: React.FC<HomeScreenProviderProps> = ({ 
  children 
}) => {
  const listRef = useRef<FlashList<any>>(null);
  const refreshFunctionRef = useRef<(() => void) | null>(null);

  const scrollToTop = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, []);

  const refreshFeed = useCallback(() => {
    if (refreshFunctionRef.current) {
      refreshFunctionRef.current();
    }
  }, []);

  const scrollToTopAndRefresh = useCallback(() => {
    scrollToTop();
    refreshFeed();
  }, [scrollToTop, refreshFeed]);

  const setRefreshFunction = useCallback((fn: () => void) => {
    refreshFunctionRef.current = fn;
  }, []);

  const value: HomeScreenContextType = {
    listRef,
    scrollToTop,
    refreshFeed,
    scrollToTopAndRefresh,
    setRefreshFunction,
  };

  return (
    <HomeScreenContext.Provider value={value}>
      {children}
    </HomeScreenContext.Provider>
  );
};
