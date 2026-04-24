import { cn } from "@/lib/utils";

export function QfLogo({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 60" 
      className={cn("text-primary drop-shadow-md", className)}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Oval border - bolder stroke */}
      <ellipse cx="50" cy="30" rx="46" ry="26" stroke="currentColor" strokeWidth="5" />
      {/* Serif QF text - larger and bolder */}
      <text 
        x="50" y="43" 
        textAnchor="middle" 
        fill="currentColor" 
        fontFamily="Georgia, 'Times New Roman', serif" 
        fontWeight="900" 
        fontSize="38"
        letterSpacing="-1.5"
      >
        QF
      </text>
    </svg>
  );
}
