import { useEffect, useMemo, useState } from "react";

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";
import type { ChatSubmitStatus, CommandSurface, ConnectionState, SkillInfo, SlashCommandInfo } from "../../core/types";
import { ArchModeToggle } from "./arch-mode-toggle";
import { PromptAttachmentButton, PromptAttachmentPreview } from "./prompt-attachments";

type ChatInputProps = {
  viewingHistory: boolean;
  archAvailable: boolean;
  connection: ConnectionState;
  archModeEnabled: boolean;
  chatStatus: ChatSubmitStatus;
  value: string;
  commandSurface: CommandSurface | null;
  onSubmit: (opts: { text: string; files?: unknown[] }) => void;
  onAbort: () => void;
  onRequestCommands: () => void;
  onToggleArchMode: () => void;
  onValueChange: (value: string) => void;
};

type SlashEntry =
  | { kind: "skill"; skill: SkillInfo }
  | { kind: "command"; command: SlashCommandInfo }
  | { kind: "skill-select" };

function entryKey(entry: SlashEntry): string {
  if (entry.kind === "skill-select") return "skill-select";
  return entry.kind === "skill" ? `skill:${entry.skill.name}` : `command:${entry.command.name}`;
}

function matchesPartial(text: string, partial: string): boolean {
  return text.toLowerCase().includes(partial.toLowerCase());
}

/**
 * Slash autocomplete: typing `/` opens a command/skill menu above the
 * input, `/skill:` narrows to the matching skill, and Arrow/Enter/Tab/Escape
 * navigate and insert the completed invocation into the draft.
 */
export function ChatInput({
  viewingHistory,
  archAvailable,
  connection,
  archModeEnabled,
  chatStatus,
  value,
  commandSurface,
  onSubmit,
  onAbort,
  onRequestCommands,
  onToggleArchMode,
  onValueChange,
}: ChatInputProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const skills = commandSurface?.skills ?? [];
  const commands = commandSurface?.commands ?? [];

  const entries = useMemo<SlashEntry[]>(() => {
    if (!value.startsWith("/")) return [];
    // `/skill` and `/skill:` narrow to the loaded skills; anything else only
    // matches slash commands. The general list exposes a single `/skill`
    // entry (inserting `/skill:`) instead of polluting results with skills.
    const skillMode = value === "/skill" || value.startsWith("/skill:");
    if (skillMode) {
      const skillQuery =
        value === "/skill" ? "" : (value.slice("/skill:".length).trimStart().split(/\s/)[0] ?? "");
      return skills
        .filter((skill) => skill.hide !== true)
        .filter((skill) => matchesPartial(skill.name, skillQuery))
        .map((skill): SlashEntry => ({ kind: "skill", skill }));
    }
    const firstWord = value.slice(1).trimStart().split(/\s/)[0] ?? "";
    const skillEntry = matchesPartial("skill", firstWord)
      ? ([{ kind: "skill-select" }] satisfies SlashEntry[])
      : [];
    const matchedCommands = commands
      .filter(
        (command) =>
          matchesPartial(command.name, firstWord) ||
          (command.description ? matchesPartial(command.description, firstWord) : false),
      )
      .map((command): SlashEntry => ({ kind: "command", command }));
    return [...skillEntry, ...matchedCommands];
  }, [commands, skills, value]);

  // Fetch command data the first time `/` is typed, open/close the menu as
  // the draft enters/leaves slash mode, and keep the cursor in bounds.
  useEffect(() => {
    if (value.startsWith("/")) {
      if (skills.length === 0 && commands.length === 0) {
        onRequestCommands();
      }
      setMenuOpen(true);
      setActiveIndex(0);
    } else if (menuOpen) {
      setMenuOpen(false);
    }
  }, [commands.length, menuOpen, onRequestCommands, skills.length, value]);

  const insertEntry = (entry: SlashEntry): void => {
    if (entry.kind === "skill-select") {
      // Open the skills list; keep the menu open for the next selection.
      onValueChange("/skill:");
      return;
    }
    const trigger = entry.kind === "skill" ? `/skill:${entry.skill.name}` : `/${entry.command.name}`;
    // Replace the leading slash token with the completed invocation; keep any
    // trailing draft text, collapsing the boundary to a single space.
    const token = /^\/[^\s]*/.exec(value)?.[0] ?? "";
    const rest = value.slice(token.length).replace(/^\s+/, "");
    onValueChange(rest ? `${trigger} ${rest}` : trigger);
    setMenuOpen(false);
  };

  const closeMenu = (): void => setMenuOpen(false);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (!menuOpen || entries.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % entries.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + entries.length) % entries.length);
      return;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      insertEntry(entries[Math.min(activeIndex, entries.length - 1)]);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    }
  };

  if (viewingHistory) {
    return (
      <footer className="shrink-0 border-t bg-background/95 px-4 py-3">
        <div className="mx-auto w-full max-w-3xl text-center text-muted-foreground text-sm py-4">Viewing history</div>
      </footer>
    );
  }

  return (
    <footer className="shrink-0 border-t bg-background/95 px-4 py-3">
      <div className="mx-auto w-full max-w-3xl">
        <div className="relative">
          {menuOpen && entries.length > 0 && (
            <div className="absolute bottom-full right-0 left-0 z-50 mb-2 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md">
              <div className="max-h-64 overflow-y-auto p-1">
                {entries.map((entry, index) => {
                  const key = entryKey(entry);
                  const isActive = index === activeIndex;
                  const trigger =
                    entry.kind === "skill-select"
                      ? "/skill"
                      : entry.kind === "skill"
                        ? `/skill:${entry.skill.name}`
                        : `/${entry.command.name}`;
                  const description =
                    entry.kind === "skill-select"
                      ? "Invoke a skill — pick one to insert /skill:<name>"
                      : entry.kind === "skill"
                        ? entry.skill.description || "Skill"
                        : entry.command.description || entry.command.name;
                  return (
                    <button
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                        isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                      )}
                      key={key}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        insertEntry(entry);
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                      type="button"
                    >
                      <span className={cn("shrink-0 font-mono text-xs", isActive ? "" : "text-muted-foreground")}>
                        {trigger}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">{description}</span>
                      {entry.kind === "command" && entry.command.source && (
                        <span className="shrink-0 text-muted-foreground text-xs">{entry.command.source}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <PromptInput
            accept="image/*"
            className="rounded-xl border bg-card shadow-sm"
            globalDrop={true}
            multiple
            onSubmit={onSubmit}
          >
            <PromptAttachmentPreview />
            <PromptInputBody>
              <PromptInputTextarea
                className="min-h-20 resize-none"
                onChange={(event) => onValueChange(event.currentTarget.value)}
                onKeyDown={handleKeyDown}
                placeholder='Type "/" for commands, "/skill:" for skills...'
                value={value}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                {archAvailable && (
                  <ArchModeToggle
                    enabled={archModeEnabled}
                    onToggle={onToggleArchMode}
                  />
                )}
                <PromptAttachmentButton />
                <div className="ml-auto flex items-center gap-1">
                  {connection === "connected" && !viewingHistory && (
                    <span className="mr-2 text-muted-foreground text-xs">
                      Ctrl+Enter to send
                    </span>
                  )}
                  {chatStatus === "streaming" ? (
                    <PromptInputSubmit onClick={onAbort}>Stop</PromptInputSubmit>
                  ) : (
                    <PromptInputSubmit />
                  )}
                </div>
              </PromptInputTools>
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </footer>
  );
}