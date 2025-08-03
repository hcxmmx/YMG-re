"use client";

import { createContext, useContext } from "react";

// 创建导航栏上下文
export const NavbarContext = createContext({
  isNavbarVisible: true,
  toggleNavbar: () => {},
  setNavbarVisible: (visible: boolean) => {}
});

// 使用上下文的钩子
export const useNavbar = () => useContext(NavbarContext);
