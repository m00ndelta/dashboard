import { useApp, type ToastKind } from "../lib/store";

const KIND_STYLE: Record<
  ToastKind,
  { bar: string; icon: string; label: string }
> = {
  info: { bar: "border-primary-container", icon: "info", label: "text-primary-container" },
  warn: { bar: "border-tertiary-fixed-dim", icon: "warning", label: "text-tertiary-fixed-dim" },
  crit: { bar: "border-error", icon: "error", label: "text-error" },
  ok: { bar: "border-secondary-fixed-dim", icon: "task_alt", label: "text-secondary-fixed-dim" },
};

export default function Toasts() {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-space-md z-[90] flex flex-col gap-space-xs w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => {
        const s = KIND_STYLE[t.kind];
        return (
          <div
            key={t.id}
            className={`anim-fade-up bg-surface-container-highest/95 backdrop-blur-md rounded p-space-sm shadow-xl border-l-2 ${s.bar} cursor-pointer`}
            onClick={() => dismissToast(t.id)}
          >
            <div className="flex items-start gap-space-sm">
              <span className={`material-symbols-outlined text-base mt-0.5 ${s.label}`}>{s.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-label-caps text-label-caps text-on-surface uppercase tracking-wider">
                  {t.title}
                </div>
                {t.msg && (
                  <div className="font-mono-sm text-mono-sm text-on-surface-variant mt-space-2xs">
                    {t.msg}
                  </div>
                )}
              </div>
              <span className="material-symbols-outlined text-sm text-outline">close</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
