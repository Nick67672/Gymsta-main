import React, { createContext, useContext, useState, ReactNode } from 'react';

type TabType = 'explore' | 'following' | 'my-gym';

interface TabContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  activeTabIndex: number;
  setActiveTabIndex: (index: number) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export const useTab = () => {
  const context = useContext(TabContext);
  if (context === undefined) {
    throw new Error('useTab must be used within a TabProvider');
  }
  return context;
};

export const TabProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Default to Explore and center it in the selector (index 1 given [My Gym, Explore, Following])
  const [activeTab, setActiveTab] = useState<TabType>('explore');
  const [activeTabIndex, setActiveTabIndex] = useState(1);

  return (
    <TabContext.Provider
      value={{
        activeTab,
        setActiveTab,
        activeTabIndex,
        setActiveTabIndex,
      }}
    >
      {children}
    </TabContext.Provider>
  );
}; 