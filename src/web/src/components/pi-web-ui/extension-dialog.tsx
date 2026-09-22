import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { AskDialogQuestion, ExtensionDialog } from "../../core/types";
import { Modal } from "./modal";

export function ExtensionDialogView({
  dialog,
  onCancel,
  onRespond,
}: {
  dialog: ExtensionDialog;
  onCancel: () => void;
  onRespond: (response: Record<string, unknown>) => void;
}) {
  const [value, setValue] = useState(dialog.prefill || "");

  if (dialog.method === "notify") {
    return (
      <Modal onClose={onCancel} title={dialog.title || dialog.notifyType || "Notification"}>
        <p className="text-sm">{dialog.message}</p>
        <div className="mt-4 flex justify-end">
          <Button onClick={onCancel} type="button">
            OK
          </Button>
        </div>
      </Modal>
    );
  }

  if (dialog.method === "ask") {
    return <AskDialogView dialog={dialog} onCancel={onCancel} onRespond={onRespond} />;
  }

  return (
    <Modal onClose={onCancel} title={dialog.title || dialog.method}>
      {dialog.message && <p className="mb-3 text-muted-foreground text-sm">{dialog.message}</p>}
      {dialog.method === "select" && (
        <div className="space-y-2">
          {(dialog.options || []).map((option) => (
            <Button
              className="w-full justify-start"
              key={option}
              onClick={() => onRespond({ value: option })}
              type="button"
              variant="outline"
            >
              {option}
            </Button>
          ))}
        </div>
      )}
      {dialog.method === "confirm" && (
        <div className="flex justify-end gap-2">
          <Button onClick={() => onRespond({ confirmed: false })} type="button" variant="outline">
            No
          </Button>
          <Button onClick={() => onRespond({ confirmed: true })} type="button">
            Yes
          </Button>
        </div>
      )}
      {dialog.method === "input" && (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            onRespond(value.trim() ? { value: value.trim() } : { cancelled: true });
          }}
        >
          <Input
            autoFocus
            onChange={(event) => setValue(event.target.value)}
            placeholder={dialog.placeholder}
            value={value}
          />
          <div className="flex justify-end gap-2">
            <Button onClick={onCancel} type="button" variant="outline">
              Cancel
            </Button>
            <Button type="submit">Submit</Button>
          </div>
        </form>
      )}
      {dialog.method === "editor" && (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            onRespond(value ? { value } : { cancelled: true });
          }}
        >
          <Textarea autoFocus className="min-h-40" onChange={(event) => setValue(event.target.value)} value={value} />
          <div className="flex justify-end gap-2">
            <Button onClick={onCancel} type="button" variant="outline">
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/**
 * Renders the agent's `ask` tool as an interactive dialog: one option button
 * per choice, multi-select support, and a "Other (type your own)" custom
 * input per question. Single-select questions submit on click; anything else
 * submits via the Submit button.
 */
function AskDialogView({
  dialog,
  onCancel,
  onRespond,
}: {
  dialog: ExtensionDialog;
  onCancel: () => void;
  onRespond: (response: Record<string, unknown>) => void;
}) {
  const questions = (dialog.questions ?? []).filter(
    (question): question is AskDialogQuestion => Boolean(question?.id && question?.question),
  );
  const [selections, setSelections] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(questions.map((question) => [question.id, []])),
  );
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});

  const anyMulti = questions.some((question) => question.multi === true);

  const toggleOption = (question: AskDialogQuestion, label: string): void => {
    if (question.multi === true) {
      setSelections((current) => {
        const selected = current[question.id] ?? [];
        return {
          ...current,
          [question.id]: selected.includes(label)
            ? selected.filter((option) => option !== label)
            : [...selected, label],
        };
      });
      return;
    }
    // Single-select: submit immediately on click.
    onRespond({ results: [{ id: question.id, selectedOptions: [label] }] });
  };

  const submit = (): void => {
    onRespond({
      results: questions.map((question) => ({
        id: question.id,
        selectedOptions: selections[question.id] ?? [],
        ...(customInputs[question.id]?.trim() ? { customInput: customInputs[question.id].trim() } : {}),
      })),
    });
  };

  return (
    <Modal onClose={onCancel} title={dialog.title || "Ask"}>
      <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
        {questions.map((question) => {
          const selected = selections[question.id] ?? [];
          return (
            <section className="space-y-2" key={question.id}>
              <div className="flex items-baseline gap-2">
                <h3 className="font-medium text-sm">{question.question}</h3>
                {question.header && (
                  <span className="rounded bg-accent px-1.5 py-0.5 text-muted-foreground text-xs">{question.header}</span>
                )}
              </div>
              <div className="space-y-1.5">
                {question.options.map((option, index) => {
                  const isSelected = selected.includes(option.label);
                  const isRecommended = question.recommended !== undefined && index === question.recommended;
                  return (
                    <button
                      className={cn(
                        "flex w-full items-start justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm",
                        isSelected ? "border-primary bg-primary/10" : "hover:bg-accent",
                      )}
                      key={option.label}
                      onClick={() => toggleOption(question, option.label)}
                      type="button"
                    >
                      <span className="min-w-0">
                        <span className="block font-medium">
                          {option.label}
                          {isRecommended && <span className="ml-1 text-muted-foreground text-xs">(Recommended)</span>}
                        </span>
                        {option.description && <span className="block text-muted-foreground">{option.description}</span>}
                      </span>
                      {question.multi === true && (
                        <span
                          className={cn(
                            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border text-[10px]",
                            isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted",
                          )}
                        >
                          {isSelected ? "✓" : ""}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <Textarea
                className="min-h-16 text-sm"
                onChange={(event) =>
                  setCustomInputs((current) => ({ ...current, [question.id]: event.target.value }))
                }
                placeholder="Other (type your own)"
                value={customInputs[question.id] ?? ""}
              />
            </section>
          );
        })}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onCancel} type="button" variant="outline">
          Cancel
        </Button>
        {(anyMulti || Object.values(customInputs).some((text) => text.trim().length > 0)) && (
          <Button onClick={submit} type="button">
            Submit
          </Button>
        )}
      </div>
    </Modal>
  );
}
