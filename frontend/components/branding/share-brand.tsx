import Image from "next/image";

type ShareMarkProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

/** Geometric mark from the official SHARE favicon asset. */
export function ShareMark({ size = 48, className = "", priority = false }: ShareMarkProps) {
  return (
    <Image
      src="/favicon.png"
      alt=""
      width={size}
      height={size}
      className={`shrink-0 select-none ${className}`}
      priority={priority}
      aria-hidden
    />
  );
}

type ShareNavWordmarkProps = {
  markSize?: number;
  subtitle?: string;
  subtitleTone?: "accent" | "muted";
};

/** Logo + bold SHARE + optional subtitle (e.g. Doctor Portal). */
export function ShareNavWordmark({
  markSize = 44,
  subtitle,
  subtitleTone = "accent",
}: ShareNavWordmarkProps) {
  const subColor = subtitleTone === "accent" ? "var(--share-brand-accent)" : "var(--app-muted)";
  return (
    <div className="flex items-center gap-3 min-w-0">
      <ShareMark size={markSize} />
      <div className="min-w-0 leading-tight">
        <p
          className="font-black tracking-tight m-0"
          style={{ color: "var(--app-fg)", fontSize: markSize > 40 ? 22 : 20, letterSpacing: "-0.03em" }}
        >
          SHARE
        </p>
        {subtitle ? (
          <p className="m-0 font-semibold text-[12px] sm:text-[13px]" style={{ color: subColor }}>
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
