import type { ReactNode } from "react";

/** Full-screen backdrop for venue terminals (top-up and stall). */
export function TerminalShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-zinc-950 text-zinc-100 selection:bg-amber-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800/50 via-zinc-950/80 to-zinc-950 z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/20 rounded-full blur-[100px] opacity-70 z-0" />
      <div
        className="absolute inset-0 z-0 opacity-[0.15]"
        style={{
          backgroundImage: "radial-gradient(#fbbf24 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(circle at center, black 40%, transparent 100%)",
        }}
      />
      <div className="stall-page-content relative z-10 flex flex-col items-center justify-center w-full h-full p-6 md:py-4">
        <div className="stall-terminal-wrapper">{children}</div>
        <div className="mt-6 text-center opacity-40 hover:opacity-100 transition-opacity">
          <span className="text-xs font-mono tracking-widest text-amber-500/80">POWERED BY SPLITHUB</span>
        </div>
      </div>
    </main>
  );
}

export function TerminalUnavailable({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
        <p className="text-zinc-400">{message}</p>
      </div>
    </div>
  );
}
