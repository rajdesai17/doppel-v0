import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

const spring = { type: "spring", stiffness: 100, damping: 20 };

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
  animated?: boolean;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  className,
  animated = true,
}: PageHeaderProps) {
  const Wrapper = animated ? motion.div : "div";
  const wrapperProps = animated
    ? {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: spring,
      }
    : {};

  return (
    <Wrapper {...wrapperProps} className={cn("text-center", className)}>
      {eyebrow && (
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/50 mb-6">
          {eyebrow}
        </p>
      )}
      <h1 className="font-serif text-4xl md:text-6xl lg:text-8xl text-white tracking-tighter leading-[1.1] mb-4 text-balance">
        {title}
      </h1>
      {subtitle && (
        <p className="max-w-md mx-auto text-white/60 text-sm md:text-base leading-relaxed text-pretty">
          {subtitle}
        </p>
      )}
    </Wrapper>
  );
}
