import type { LibraryInspirationEntry } from "@/lib/libraryInspiration";

interface InspirationVisualProps {
  entry: LibraryInspirationEntry;
}

export function LibraryInspirationPreview({ entry }: InspirationVisualProps) {
  return (
    <div className={`relative aspect-[16/9] w-full overflow-hidden rounded-[28px] bg-gradient-to-br ${entry.gradient}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.3),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(0,0,0,0.25),transparent_60%)]" />
      <div className="relative z-10 flex h-full flex-col justify-between p-10 text-left text-white">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em]">
            {entry.tag}
          </span>
          <span className="text-sm font-medium uppercase tracking-[0.18em] text-white/80">Library highlight</span>
        </div>

        <div className="space-y-4">
          <h3 className="text-2xl font-semibold tracking-tight drop-shadow-sm md:text-3xl">{entry.title}</h3>
          <p className="max-w-xl text-sm font-medium text-white/90 md:text-base">{entry.description}</p>
        </div>

        <div className="flex items-center justify-between gap-4 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
          <span>{entry.focus}</span>
          <span className="rounded-full bg-white/15 px-3 py-1 text-[10px]">Preset</span>
        </div>
      </div>
    </div>
  );
}

export function LibraryInspirationThumbnail({ entry }: InspirationVisualProps) {
  return (
    <div className={`relative h-full w-full overflow-hidden rounded-2xl bg-gradient-to-br ${entry.thumbnailGradient}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.45),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(0,0,0,0.2),transparent_70%)]" />
      <div className="relative z-10 flex h-full flex-col items-start justify-between p-4 text-left text-white">
        <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em]">
          {entry.tag}
        </span>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">Focus</p>
          <p className="text-sm font-semibold leading-tight text-white">{entry.focus}</p>
        </div>
      </div>
    </div>
  );
}
