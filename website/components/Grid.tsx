interface GridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

export function Grid({
  children,
  cols = 3,
  gap = "md",
  className = "",
}: GridProps) {
  const colsClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 lg:grid-cols-2",
    3: "grid-cols-1 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  }[cols];

  const gapClass = {
    sm: "gap-4",
    md: "gap-8",
    lg: "gap-12",
  }[gap];

  return (
    <div className={`grid ${colsClass} ${gapClass} ${className}`}>
      {children}
    </div>
  );
}

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  background?: "white" | "gray" | "gradient" | "dark";
}

export function Section({
  children,
  className = "",
  background = "dark",
}: SectionProps) {
  const bgClass = {
    white: "bg-white",
    gray: "bg-gray-50",
    gradient: "bg-gradient-to-b from-white to-gray-50",
    dark: "bg-black",
  }[background];

  return (
    <section className={`py-24 ${bgClass} ${className}`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">{children}</div>
    </section>
  );
}

interface ContainerProps {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Container({
  children,
  size = "lg",
  className = "",
}: ContainerProps) {
  const sizeClass = {
    sm: "max-w-2xl",
    md: "max-w-4xl",
    lg: "max-w-7xl",
    xl: "max-w-[90rem]",
  }[size];

  return (
    <div className={`mx-auto ${sizeClass} px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}
