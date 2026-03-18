import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface UserContextType {
  userName: string | null;
  setUserName: (name: string | null) => void;
}

const UserContext = createContext<UserContextType>({ userName: null, setUserName: () => {} });

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [userName, setUserNameState] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(data => { if (data.name) setUserNameState(data.name); })
      .catch(() => {});
  }, []);

  const setUserName = (name: string | null) => {
    setUserNameState(name);
    if (name) {
      fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }).catch(() => {});
    }
  };

  return (
    <UserContext.Provider value={{ userName, setUserName }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
