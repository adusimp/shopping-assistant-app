import React, { createContext, useState, useContext, useEffect } from 'react';

// Định nghĩa kiểu dữ liệu User
interface User {
  user_id: number;
  email: string;
}

interface UserContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType>({} as any);

export const UserProvider = ({ children }: any) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (userData: User) => {
    console.log("--- CONTEXT: Hàm login được gọi ---");
    console.log("--- CONTEXT: Dữ liệu nhận được:", userData);
    
    // Quan trọng: Dùng spread operator {...userData} để tạo tham chiếu mới
    // Giúp React nhận biết state đã thay đổi
    setUser({ ...userData }); 
  };

  const logout = () => {
    console.log("--- CONTEXT: Logout ---");
    setUser(null);
  };

  // Log mỗi khi state user thay đổi
  useEffect(() => {
    console.log("--- CONTEXT: State user hiện tại là:", user);
  }, [user]);

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);