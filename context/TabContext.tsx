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
  const [activeTab, setActiveTab] = useState<TabType>('my-gym');
  const [activeTabIndex, setActiveTabIndex] = useState(0);

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