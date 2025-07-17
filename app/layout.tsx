"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { useState, useEffect, createContext, useContext } from "react";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

// 创建导航栏上下文
export const NavbarContext = createContext({
  isNavbarVisible: true,
  toggleNavbar: () => {},
  setNavbarVisible: (visible: boolean) => {}
});

// 使用上下文的钩子
export const useNavbar = () => useContext(NavbarContext);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const pathname = usePathname();
  
  // 当路由变化时，重置导航栏为可见
  useEffect(() => {
    setIsNavbarVisible(true);
  }, [pathname]);
  
  const toggleNavbar = () => {
    setIsNavbarVisible(prev => !prev);
  };
  
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NavbarContext.Provider value={{ 
            isNavbarVisible, 
            toggleNavbar, 
            setNavbarVisible: setIsNavbarVisible 
          }}>
            <div className="flex flex-col min-h-screen">
              <div 
                className={`transition-all duration-300 ease-in-out ${
                  isNavbarVisible ? "translate-y-0" : "-translate-y-full h-0 overflow-hidden"
                }`}
              >
                <Header />
              </div>
              <main className={`flex-1 transition-all duration-300 ease-in-out`}>{children}</main>
            </div>
          </NavbarContext.Provider>
        </ThemeProvider>
      </body>
    </html>
  );
} 