import React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs transition-all",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between gap-2 pb-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-base sm:text-lg font-bold tracking-tight text-slate-800", className)} {...props}>
      {children}
    </h3>
  );
}

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "destructive" | "purple";
}) {
  const variantStyles = {
    default: "bg-slate-900 text-white",
    secondary: "bg-slate-100 text-slate-700",
    outline: "border border-slate-200 text-slate-700",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    destructive: "bg-rose-50 text-rose-700 border border-rose-200",
    purple: "bg-purple-50 text-purple-700 border border-purple-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function Button({
  className,
  variant = "default",
  size = "default",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  const base =
    "inline-flex items-center justify-center font-medium rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] cursor-pointer";

  const variants = {
    default: "bg-rose-600 text-white hover:bg-rose-700",
    outline: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
    secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    ghost: "text-slate-600 hover:bg-slate-100",
    destructive: "bg-rose-600 text-white hover:bg-rose-700",
  };

  const sizes = {
    default: "h-10 px-4 py-2 text-sm",
    sm: "h-8 px-3 text-xs",
    lg: "h-12 px-6 text-base",
    icon: "h-9 w-9 p-0",
  };

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}

export function MetricCard({
  title,
  value,
  subtext,
  icon: Icon,
  colorClass = "text-rose-500 bg-rose-50",
}: {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ElementType;
  colorClass?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl font-bold shrink-0", colorClass)}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="text-xs font-medium text-slate-500">{title}</div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">{value}</div>
        {subtext && <div className="text-[11px] text-slate-400 mt-0.5">{subtext}</div>}
      </div>
    </div>
  );
}

