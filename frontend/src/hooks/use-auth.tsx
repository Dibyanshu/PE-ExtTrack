import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { AuthUser, AuthUserRole } from "@workspace/api-client-react";

interface AuthContextType {
  user: AuthUser | null;
  role: AuthUserRole | null;
  canViewHistory: boolean;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hydrated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedToken = localStorage.getItem("pe_token");
    const storedUser = localStorage.getItem("pe_user");

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("pe_token");
        localStorage.removeItem("pe_user");
      }
    }
    setHydrated(true);
  }, []);

  const login = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem("pe_token", newToken);
    localStorage.setItem("pe_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("pe_token");
    localStorage.removeItem("pe_user");
    setToken(null);
    setUser(null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        canViewHistory: user?.canViewHistory ?? false,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        hydrated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
