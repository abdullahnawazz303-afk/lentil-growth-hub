import { cn } from "@/lib/utils";

export function QfLogo({ className }: { className?: string }) {
  return (
    <img 
      src="/qf-favicon.png" 
      alt="Qais Foods Logo"
      className={cn("object-contain", className)}
    />
  );
}
