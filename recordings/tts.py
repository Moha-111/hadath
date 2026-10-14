"""Generate one WAV per narration line with Piper (local, offline).
Usage: python3 recordings/tts.py <model.onnx> <out_dir> [length_scale]
"""
import json, subprocess, sys, wave, pathlib
model, out = sys.argv[1], pathlib.Path(sys.argv[2])
scale = sys.argv[3] if len(sys.argv) > 3 else "0.92"
out.mkdir(parents=True, exist_ok=True)
lines = json.load(open(pathlib.Path(__file__).with_name("narration.json"), encoding="utf-8"))["lines"]
durations = {}
for ln in lines:
    wav = out / f"{ln['id']}.wav"
    subprocess.run([sys.executable, "-m", "piper", "-m", model, "-f", str(wav), "--length-scale", scale, "--sentence-silence", "0.1"],
                   input=ln["tts"].encode("utf-8"), check=True, capture_output=True)
    with wave.open(str(wav)) as w:
        durations[ln["id"]] = round(w.getnframes() / w.getframerate(), 3)
json.dump(durations, open(out / "durations.json", "w"), indent=1)
print(json.dumps(durations), "total", round(sum(durations.values()), 1))
