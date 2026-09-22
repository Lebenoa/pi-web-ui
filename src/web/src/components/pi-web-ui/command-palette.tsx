import type { CommandAction, CommandSurface } from "../../core/types";
import { Modal } from "./modal";

export function CommandPalette({
  commands,
  surface,
  loading,
  onClose,
  onInsert,
}: {
  commands: CommandAction[];
  surface: CommandSurface | null;
  loading: boolean;
  onClose: () => void;
  onInsert: (text: string) => void;
}) {
  const visibleSkills = (surface?.skills ?? []).filter((skill) => skill.hide !== true);
  const hasCommands = (surface?.commands.length ?? 0) > 0;

  const insertAndClose = (text: string): void => {
    onClose();
    onInsert(text);
  };

  return (
    <Modal onClose={onClose} title="Commands">
      <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        <section className="space-y-1">
          <h3 className="mb-2 px-3 text-muted-foreground text-xs">Actions</h3>
          {commands.map((command) => {
            const Icon = command.icon;
            return (
              <button
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-muted"
                key={command.label}
                onClick={() => {
                  onClose();
                  command.action();
                }}
                type="button"
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="text-sm">{command.label}</div>
                  <div className="text-muted-foreground text-xs">{command.desc}</div>
                </div>
              </button>
            );
          })}
        </section>

        {surface && visibleSkills.length > 0 && (
          <section className="space-y-1">
            <h3 className="mb-2 px-3 text-muted-foreground text-xs">Skills ({visibleSkills.length})</h3>
            {visibleSkills.map((skill) => (
              <button
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-muted"
                key={skill.name}
                onClick={() => insertAndClose(skill.trigger ?? `/skill:${skill.name}`)}
                type="button"
              >
                <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                  /skill:{skill.name}
                </span>
                <div className="min-w-0">
                  <div className="text-sm">{skill.name}</div>
                  {skill.description && (
                    <div className="line-clamp-2 text-muted-foreground text-xs">{skill.description}</div>
                  )}
                </div>
              </button>
            ))}
          </section>
        )}

        {surface && hasCommands && (
          <section className="space-y-1">
            <h3 className="mb-2 px-3 text-muted-foreground text-xs">Slash Commands ({surface.commands.length})</h3>
            {surface.commands.map((command) => (
              <button
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-muted"
                key={`${command.source ?? "ext"}:${command.name}`}
                onClick={() => insertAndClose(`/${command.name}`)}
                type="button"
              >
                <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                  /{command.name}
                </span>
                <div className="min-w-0">
                  <div className="text-sm">{command.description || command.name}</div>
                  {command.source && (
                    <div className="text-muted-foreground text-xs">
                      {command.source}
                      {command.location ? ` · ${command.location}` : ""}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </section>
        )}

        {!surface && loading && <p className="px-3 text-muted-foreground text-sm">Loading commands…</p>}
        {surface && !loading && visibleSkills.length === 0 && !hasCommands && (
          <p className="px-3 text-muted-foreground text-sm">No additional commands or skills.</p>
        )}
      </div>
    </Modal>
  );
}