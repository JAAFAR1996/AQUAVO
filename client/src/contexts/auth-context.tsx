import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { addCsrfHeader } from "@/lib/csrf";

interface User {
  id: string;
  email: string;
  fullName?: string;
  role: string;
  phone?: string;
  loyaltyPoints?: number;
  loyaltyTier?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  register: (name: string, email: string, password: string, phone: string) => Promise<void>;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/user", {
        credentials: "include",
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          rememberMe,
        }),
      });

      // Check if response is HTML (server error or not JSON)
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Server returned non-JSON response:", await response.text());
        throw new Error("خطأ في الخادم. تأكد من تشغيل السيرفر (pnpm run dev)");
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "فشل تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور.");
      }

      const userData = await response.json();
      if (import.meta.env.DEV) {
        console.log("✅ Login successful:", userData);
      }
      setUser(userData);
    } catch (error: unknown) {
      console.error("❌ Login error:", error);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string, phone: string) => {
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: addCsrfHeader({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          fullName: name,
          email,
          password,
          role: "user",
          phone,
        }),
      });

      // Check if response is HTML (server error or not JSON)
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Server returned non-JSON response:", await response.text());
        throw new Error("خطأ في الخادم. تأكد من تشغيل السيرفر (pnpm run dev)");
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "فشل إنشاء الحساب.");
      }

      if (import.meta.env.DEV) {
        console.log("✅ Registration successful");
      }
      // Automatically login after register (server handles session)
      const userData = await response.json();
      setUser(userData);
    } catch (error: unknown) {
      console.error("❌ Register error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        headers: addCsrfHeader(),
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setLocation("/");
    }
  };

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, isAdmin }}>
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
