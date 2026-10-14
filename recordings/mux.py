"""Assemble the final MP4: recorded screen + narration placed at the recorded
line start times + soft Arabic subtitle track. Also writes .srt and .vtt.
Usage: python3 recordings/mux.py <out-dir> <tts-dir> <final.mp4>
"""
import json, pathlib, subprocess, sys

out, tts, final = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])
tl = json.load(open(out / "timeline.json", encoding="utf-8"))
lines = tl["timeline"]
offset = max(0.0, lines[0]["start"] - 0.6)  # trim the blank page-load frames
end = lines[-1]["start"] + lines[-1]["dur"] + 1.4 - offset

def ts(sec: float, sep: str) -> str:
    ms = int(round(sec * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02}{sep}{ms:03}"

srt, vtt = [], ["WEBVTT", ""]
for i, ln in enumerate(lines, 1):
    a, b = ln["start"] - offset, ln["start"] - offset + ln["dur"]
    srt += [str(i), f"{ts(a, ',')} --> {ts(b, ',')}", ln["caption"], ""]
    vtt += [f"{ts(a, '.')} --> {ts(b, '.')}", ln["caption"], ""]
stem = final.with_suffix("")
pathlib.Path(f"{stem}.ar.srt").write_text("\n".join(srt), encoding="utf-8")
pathlib.Path(f"{stem}.ar.vtt").write_text("\n".join(vtt), encoding="utf-8")

inputs, filters = [], []
for i, ln in enumerate(lines):
    inputs += ["-i", str(tts / f"{ln['id']}.wav")]
    d = int(round((ln["start"] - offset) * 1000))
    filters.append(f"[{i + 1}:a]aresample=48000,adelay={d}|{d}[a{i}]")
mix = "".join(f"[a{i}]" for i in range(len(lines))) + f"amix=inputs={len(lines)}:normalize=0,apad,atrim=0:{end:.3f},loudnorm=I=-16:TP=-1.5[aout]"
cmd = ["ffmpeg", "-y", "-v", "error", "-ss", f"{offset:.3f}", "-i", tl["raw"], *inputs,
       "-i", f"{stem}.ar.srt",
       "-filter_complex", ";".join(filters + [mix]),
       "-map", "0:v", "-map", "[aout]", "-map", f"{len(lines) + 1}:s",
       "-t", f"{end:.3f}", "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-pix_fmt", "yuv420p",
       "-c:a", "aac", "-b:a", "160k", "-c:s", "mov_text", "-metadata:s:s:0", "language=ara",
       "-metadata", "title=HADATH | حدث — simulation video (synthetic data)", "-movflags", "+faststart", str(final)]
subprocess.run(cmd, check=True)
print(f"wrote {final} ({end:.1f}s), {stem}.ar.srt, {stem}.ar.vtt")
