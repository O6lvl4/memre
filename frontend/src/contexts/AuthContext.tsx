import { createContext, useContext, type ReactNode } from "react";
import type { User } from "../lib/storage";

// Local-only stub: Memre is a desktop app sharing a single device user.
// Existing components use `user.id` to scope storage; we hand them a fixed id.
const LOCAL_USER: User = {
  id: "local",
  name: "Local",
  email: "local@memre.app",
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credential: string) => void;
  logout: () => void;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        user: LOCAL_USER,
        token: null,
        login: () => {},
        logout: () => {},
        isAuthReady: true,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
