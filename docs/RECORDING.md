# Recording the demo GIF

The README references `docs/demo.gif`. This file is captured by hand. Drop the recording at `docs/demo.gif` and commit.

## What to capture

A ~10-15 second loop showing live observation of a Claude Code session.

1. Browser at `http://127.0.0.1:7777` showing the empty timeline.
2. Run a Claude Code session in another terminal that does 4-6 tool calls (a small refactor, a Read + Edit + Bash sequence).
3. Watch new rows stream into the timeline pane in real time.
4. Click a row -> right pane shows tool input/output.
5. Switch the main pane to the Heatmap tab -> file activity counts visible.
6. Drag the scrubber -> timeline rewinds turn-by-turn.

Aim for one continuous take. No cuts.

## Suggested capture

- macOS: `cmd-shift-5`, then convert to GIF via `gifski` or `ffmpeg`.
- Windows: ScreenToGif (https://www.screentogif.com/), export GIF directly.
- Linux: `peek` or `byzanz-record`.

## Encoding

Keep the file small enough to render inline on GitHub.

```bash
# Re-encode an existing GIF down to width 1200, 15 fps, palette-optimized
ffmpeg -i raw.gif -vf "fps=15,scale=1200:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" docs/demo.gif
```

Target: under 5 MB. Under 3 MB ideal.

## Tips

- Use a 1200-1400 px viewport. Wider gets shrunk on GitHub.
- Pick a simple session: too much text in the inspector pane and the GIF balloons.
- Hide secrets in the timeline before recording. Use a throwaway session.
