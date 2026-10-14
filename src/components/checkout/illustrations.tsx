import { cn } from "@/lib/cn";

// Drawn in code (not exported from the designs) so the moving parts can be
// animated: the clock's hand sweeps, the padlock's shackle lifts.

export function Leaves({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 420"
      fill="currentColor"
      className={cn("pointer-events-none absolute", className)}
    >
      <g className="origin-center animate-drift motion-reduce:animate-none">
        <path d="M250 0c95 20 150 95 150 190V0H250Z" opacity=".55" />
        <path
          d="M150 120c110-10 205 60 235 175-110 20-215-55-235-175Z"
          opacity=".8"
        />
        <path d="M40 235c105-25 205 30 245 135C180 400 75 345 40 235Z" />
      </g>
    </svg>
  );
}

export function ClockIllustration({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 320 320" className={className}>
      <circle cx="160" cy="160" r="156" fill="#7a3dff" />
      <circle cx="160" cy="160" r="132" fill="#c9b3ff" />
      <g stroke="#fff" strokeWidth="9" strokeLinecap="round">
        <path d="M160 52v26M160 242v26M52 160h26M242 160h26" />
        <path
          d="M84 84l16 16M220 220l16 16M236 84l-16 16M100 220l-16 16"
          opacity=".7"
        />
      </g>
      <g className="origin-[160px_160px] animate-sweep motion-reduce:animate-none">
        <path
          d="M160 160V74"
          stroke="#1d2a6b"
          strokeWidth="12"
          strokeLinecap="round"
        />
      </g>
      <path
        d="M160 160l52 34"
        stroke="#1d2a6b"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <circle cx="160" cy="160" r="15" fill="#ff5a4d" />
    </svg>
  );
}

export function LockIllustration({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 320 360" className={className}>
      <g className="animate-shackle motion-reduce:animate-none">
        <path
          d="M92 170v-52a68 68 0 0 1 136 0v52"
          fill="none"
          stroke="#c9b3ff"
          strokeWidth="34"
          strokeLinecap="round"
        />
      </g>
      <rect x="40" y="150" width="240" height="200" rx="34" fill="#c9b3ff" />
      <circle cx="160" cy="232" r="22" fill="#fff" />
      <rect x="150" y="238" width="20" height="54" rx="10" fill="#fff" />
    </svg>
  );
}
