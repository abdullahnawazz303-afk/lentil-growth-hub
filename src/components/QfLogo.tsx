import { cn } from "@/lib/utils";

export function QfLogo({ className, isWhite = false }: { className?: string; isWhite?: boolean }) {
  // Check if className contains typical white overrides
  const useWhite = isWhite || className?.includes("text-white") || className?.includes("text-primary-foreground");

  return (
    <div className={cn("flex flex-col items-start justify-center leading-none select-none", className)}>
      <div className="flex items-center">
        <span 
          className={cn(
            "font-display font-black text-3xl md:text-4xl tracking-tighter transition-colors",
            useWhite ? "text-white" : "text-foreground"
          )}
        >
          QAIS
        </span>
        <span 
          className={cn(
            "w-2 h-2 md:w-2.5 md:h-2.5 rounded-full ml-1 mt-2",
            useWhite ? "bg-white" : "bg-primary"
          )}
        />
      </div>
      <span 
        className={cn(
          "font-bold text-[10px] md:text-xs tracking-[0.4em] uppercase mt-1.5 ml-0.5",
          useWhite ? "text-white/90" : "text-muted-foreground"
        )}
      >
        FOODS
      </span>
    </div>
  );
}
