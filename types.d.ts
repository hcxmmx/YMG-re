import React from 'react';

// 为react-markdown添加简单的类型声明
declare module 'react-markdown' {
  import { ReactNode } from 'react';
  
  export interface ReactMarkdownProps {
    children: string;
    components?: Record<string, React.ComponentType<any>>;
    className?: string;
    [key: string]: any;
  }
  
  export default function ReactMarkdown(props: ReactMarkdownProps): ReactNode;
}

// 为class-variance-authority添加类型声明
declare module 'class-variance-authority' {
  export type VariantProps<Component extends (...args: any) => any> = {
    [Prop in keyof Parameters<Component>[0]]?: Parameters<Component>[0][Prop];
  };
  
  export function cva(base: string, config?: any): (...args: any[]) => string;
}

// 为@radix-ui/react-slot添加类型声明
declare module '@radix-ui/react-slot' {
  import { ReactNode, ElementType, ComponentPropsWithoutRef } from 'react';

  interface SlotProps extends ComponentPropsWithoutRef<'span'> {
    children?: ReactNode;
    asChild?: boolean;
  }

  export const Slot: React.ForwardRefExoticComponent<SlotProps>;
}

// 为其他可能缺少类型的库添加声明
declare module 'lucide-react';
declare module '@google/generative-ai'; 