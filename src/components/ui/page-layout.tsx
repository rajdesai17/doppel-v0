import { cn } from "../../lib/utils";

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <main
      className={cn(
        "min-h-screen w-full flex flex-col items-center justify-center px-4 bg-black",
        className
      )}
    >
      {children}
    </main>
  );
}
