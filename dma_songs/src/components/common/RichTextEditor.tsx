import * as React from "react";
import { Bold, Italic, Heading2, List, ListOrdered, Quote, Link2, Undo2 } from "lucide-react";
import { sanitizeRichText } from "@/lib/sanitize";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  id?: string;
  ariaLabel?: string;
  error?: boolean;
}

type Command = { icon: React.ReactNode; label: string; run: () => void };

/**
 * A deliberately small editor. It produces only the tags the sanitizer allows,
 * and every change is passed through the sanitizer before it reaches form
 * state — so nothing unsafe can be typed, pasted or scripted into an
 * announcement, and what is stored is what will be rendered.
 */
export function RichTextEditor({ value, onChange, id, ariaLabel, error }: RichTextEditorProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  /**
   * The last HTML this component sent upwards.
   *
   * This exists to stop the box being rewritten underneath the person typing.
   * Every keystroke is sanitized before it reaches form state, and the
   * sanitizer normalises as it goes — wrapping bare text in a paragraph,
   * closing tags, escaping entities. So the value coming back down almost
   * never matches the raw HTML in the box, and a naive `innerHTML !== value`
   * check fires on every character, replaces the DOM, and drops the caret
   * back to the start of the field. Comparing against what we last emitted
   * tells external changes (loading a song to edit, a reset) apart from the
   * echo of our own typing.
   */
  const lastEmitted = React.useRef<string | null>(null);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Our own change coming back around: leave the DOM and the caret alone.
    if (value === lastEmitted.current) return;

    // Never overwrite the field while it has focus. A form reset landing
    // mid-sentence would otherwise wipe what is being typed.
    if (document.activeElement === node) return;

    if (node.innerHTML !== (value ?? "")) node.innerHTML = value ?? "";
  }, [value]);

  const emit = React.useCallback(() => {
    if (!ref.current) return;
    const html = sanitizeRichText(ref.current.innerHTML);
    lastEmitted.current = html;
    onChange(html);
  }, [onChange]);

  const exec = React.useCallback(
    (command: string, argument?: string) => {
      ref.current?.focus();
      document.execCommand(command, false, argument);
      emit();
    },
    [emit],
  );

  const commands: Command[] = [
    { icon: <Bold className="h-4 w-4" />, label: "Bold", run: () => exec("bold") },
    { icon: <Italic className="h-4 w-4" />, label: "Italic", run: () => exec("italic") },
    { icon: <Heading2 className="h-4 w-4" />, label: "Heading", run: () => exec("formatBlock", "<h2>") },
    { icon: <List className="h-4 w-4" />, label: "Bulleted list", run: () => exec("insertUnorderedList") },
    { icon: <ListOrdered className="h-4 w-4" />, label: "Numbered list", run: () => exec("insertOrderedList") },
    { icon: <Quote className="h-4 w-4" />, label: "Quote", run: () => exec("formatBlock", "<blockquote>") },
    {
      icon: <Link2 className="h-4 w-4" />,
      label: "Add link",
      run: () => {
        const url = window.prompt("Link address (https://…)");
        if (!url) return;
        if (!/^https?:\/\//i.test(url)) {
          window.alert("Links have to start with https://");
          return;
        }
        exec("createLink", url);
      },
    },
    { icon: <Undo2 className="h-4 w-4" />, label: "Undo", run: () => exec("undo") },
  ];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border bg-card focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        error ? "border-destructive" : "border-input",
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/60 p-1" role="toolbar" aria-label="Formatting">
        {commands.map((command) => (
          <button
            key={command.label}
            type="button"
            onClick={command.run}
            title={command.label}
            aria-label={command.label}
            className="rounded p-2 text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {command.icon}
          </button>
        ))}
      </div>
      <div
        id={id}
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel ?? "Announcement text"}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        onPaste={(event) => {
          // Paste as plain text; formatting comes from the toolbar only.
          event.preventDefault();
          const text = event.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
        }}
        className="prose-announcement min-h-[180px] w-full px-3 py-2 text-sm focus:outline-none"
      />
    </div>
  );
}
