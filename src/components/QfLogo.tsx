import { cn } from "@/lib/utils";

export function QfLogo({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 60" 
      className={cn("text-primary drop-shadow-sm", className)}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Oval border */}
      <ellipse cx="50" cy="30" rx="46" ry="26" stroke="currentColor" strokeWidth="3" />
      {/* Serif QF text */}
      <text 
        x="50" y="42" 
        textAnchor="middle" 
        fill="currentColor" 
        fontFamily="Georgia, 'Times New Roman', serif" 
        fontWeight="bold" 
        fontSize="34"
        letterSpacing="-1"
      >
        QF
      </text>
    </svg>
  );
}
