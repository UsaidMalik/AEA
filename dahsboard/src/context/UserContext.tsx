import { createContext, useContext, useState, ReactNode } from 'react';

interface UserContextType {
  userName: string | null;
  setUserName: (name: string | null) => void;
}

const UserContext = createContext<UserContextType>({ userName: null, setUserName: () => {} });

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [userName, setUserNameState] = useState<string | null>(
    () => localStorage.getItem('aea_user_name')
  );

  const setUserName = (name: string | null) => {
    if (name) {
      localStorage.setItem('aea_user_name', name);
    } else {
      localStorage.removeItem('aea_user_name');
    }
    setUserNameState(name);
  };

  return (
    <UserContext.Provider value={{ userName, setUserName }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
