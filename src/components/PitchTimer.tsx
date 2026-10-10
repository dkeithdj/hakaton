import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDuration } from "@/lib/api";
import { cn } from "@/lib/utils";

const PRESETS = [5, 4, 3, 2, 1];

function beep() {
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.3, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 1);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 1);
  oscillator.onended = () => context.close();
}

export function PitchTimer() {
  const [durationMs, setDurationMs] = useState(5 * 60_000);
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [customMinutes, setCustomMinutes] = useState("");
  const beeped = useRef(false);

  useEffect(() => {
    if (endsAt === null) return;
    const timer = setInterval(() => {
      const left = Math.max(0, endsAt - Date.now());
      setRemainingMs(left);
      if (left === 0 && !beeped.current) {
        beeped.current = true;
        beep();
        setEndsAt(null);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [endsAt]);

  function setDuration(ms: number) {
    setEndsAt(null);
    setDurationMs(ms);
    setRemainingMs(ms);
  }

  function start() {
    beeped.current = false;
    setEndsAt(Date.now() + (remainingMs > 0 ? remainingMs : durationMs));
  }

  const running = endsAt !== null;
  const warning = remainingMs <= 30_000;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={cn("font-mono text-6xl font-semibold tabular-nums", warning && "text-destructive")}>
        {formatDuration(remainingMs)}
      </div>
      <div className="flex gap-2">
        {running ? (
          <Button variant="outline" onClick={() => setEndsAt(null)}>
            Pause
          </Button>
        ) : (
          <Button onClick={start}>Start</Button>
        )}
        <Button variant="ghost" onClick={() => setDuration(durationMs)}>
          Reset
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {PRESETS.map((minutes) => (
          <Button
            key={minutes}
            size="sm"
            variant={durationMs === minutes * 60_000 ? "secondary" : "ghost"}
            onClick={() => setDuration(minutes * 60_000)}
          >
            {minutes}:00
          </Button>
        ))}
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const minutes = Number(customMinutes);
            if (minutes > 0 && minutes <= 120) setDuration(Math.round(minutes * 60_000));
          }}
        >
          <Input
            className="w-24"
            inputMode="decimal"
            placeholder="Minutes"
            aria-label="Custom minutes"
            value={customMinutes}
            onChange={(event) => setCustomMinutes(event.target.value)}
          />
          <Button size="sm" variant="outline" type="submit">
            Set
          </Button>
        </form>
      </div>
    </div>
  );
}
