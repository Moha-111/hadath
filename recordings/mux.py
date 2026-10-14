"""Assemble the final MP4 from the recorded screen and its timeline.

Narrated (Arabic):  python3 recordings/mux.py <out-dir> <tts-dir> <final.mp4>
  Places each narration clip at its recorded start time and adds a soft Arabic
  subtitle track.
Silent (English):   python3 recordings/mux.py <out-dir> - <final.mp4>
  No narration (a silent audio track keeps players and social sites happy) and
  two soft subtitle tracks, English then Arabic.
Writes .srt and .vtt next to the MP4 for every subtitle language.
"""
import json, pathlib, subprocess, sys

out, tts_arg, final = pathlib.Path(sys.argv[1]), sys.argv[2], pathlib.Path(sys.argv[3])
silent = tts_arg == "-"
tts = None if silent else pathlib.Path(tts_arg)
tl = json.load(open(out / "timeline.json", encoding="utf-8"))
lines = tl["timeline"]
offset = max(0.0, lines[0]["start"] - 0.6)  # trim the blank page-load frames
end = lines[-1]["start"] + lines[-1]["dur"] + 1.4 - offset

def ts(sec: float, sep: str) -> str:
    ms = int(round(sec * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02}{sep}{ms:03}"

stem = final.with_suffix("")
subs = [("en", "eng", "caption_en"), ("ar", "ara", "caption")] if silent else [("ar", "ara", "caption")]
for code, _, key in subs:
    srt, vtt = [], ["WEBVTT", ""]
    for i, ln in enumerate(lines, 1):
        a, b = ln["start"] - offset, ln["start"] - offset + ln["dur"]
        srt += [str(i), f"{ts(a, ',')} --> {ts(b, ',')}", ln[key], ""]
        vtt += [f"{ts(a, '.')} --> {ts(b, '.')}", ln[key], ""]
    pathlib.Path(f"{stem}.{code}.srt").write_text("\n".join(srt), encoding="utf-8")
    pathlib.Path(f"{stem}.{code}.vtt").write_text("\n".join(vtt), encoding="utf-8")

cmd = ["ffmpeg", "-y", "-v", "error", "-ss", f"{offset:.3f}", "-i", tl["raw"]]
if silent:
    cmd += ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]
    audio_map, n_audio_inputs, fc = "1:a", 1, []
else:
    filters = []
    for i, ln in enumerate(lines):
        cmd += ["-i", str(tts / f"{ln['id']}.wav")]
        d = int(round((ln["start"] - offset) * 1000))
        filters.append(f"[{i + 1}:a]aresample=48000,adelay={d}|{d}[a{i}]")
    mix = "".join(f"[a{i}]" for i in range(len(lines))) + f"amix=inputs={len(lines)}:normalize=0,apad,atrim=0:{end:.3f},loudnorm=I=-16:TP=-1.5[aout]"
    audio_map, n_audio_inputs, fc = "[aout]", len(lines), ["-filter_complex", ";".join(filters + [mix])]
sub_maps, sub_meta = [], []
for j, (code, lang3, _) in enumerate(subs):
    cmd += ["-i", f"{stem}.{code}.srt"]
    sub_maps += ["-map", f"{1 + n_audio_inputs + j}:s"]
    sub_meta += [f"-metadata:s:s:{j}", f"language={lang3}"]
cmd += [*fc, "-map", "0:v", "-map", audio_map, *sub_maps,
        "-t", f"{end:.3f}", "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "64k" if silent else "160k", "-c:s", "mov_text", *sub_meta, "-disposition:s:0", "default",
        "-metadata", "title=HADATH | حدث — simulation video (synthetic data)", "-movflags", "+faststart", str(final)]
subprocess.run(cmd, check=True)
print(f"wrote {final} ({end:.1f}s) with subtitles: {', '.join(c for c, _, _ in subs)}")
