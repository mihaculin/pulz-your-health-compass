import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-md", className)}
      style={{
        background: "linear-gradient(90deg, hsl(172 55% 94%) 25%, hsl(284 16% 82%) 50%, hsl(172 55% 94%) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s ease-in-out infinite",
      }}
      {...props}
    />
  );
}

export { Skeleton };
