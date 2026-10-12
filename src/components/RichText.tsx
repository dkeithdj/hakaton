import { cn } from "@/lib/utils";

const INLINE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/;

function inline(text: string): React.ReactNode[] {
  // Splitting on a capturing group leaves the matches at the odd indexes.
  return text.split(INLINE).map((part, index) => {
    if (index % 2 === 0) return part;
    if (part.startsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`")) {
      return (
        <code key={index} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <em key={index}>{part.slice(1, -1)}</em>;
  });
}

/**
 * Organizer-written text with light formatting: `**bold**`, `*italic*`, `` `code` ``, and lines that start
 * with "- " as bullets. Anything else is shown as typed, one paragraph per line.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks: { bullets: boolean; lines: string[] }[] = [];
  for (const line of text.split("\n").map((entry) => entry.trim())) {
    if (line === "") continue;
    const bullets = line.startsWith("- ");
    const last = blocks.at(-1);
    if (bullets && last?.bullets) last.lines.push(line.slice(2));
    else blocks.push({ bullets, lines: [bullets ? line.slice(2) : line] });
  }
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {blocks.map((block, index) =>
        block.bullets ? (
          <ul key={index} className="flex list-disc flex-col gap-0.5 pl-5">
            {block.lines.map((line, item) => (
              <li key={item}>{inline(line)}</li>
            ))}
          </ul>
        ) : (
          <p key={index}>{inline(block.lines[0])}</p>
        ),
      )}
    </div>
  );
}
