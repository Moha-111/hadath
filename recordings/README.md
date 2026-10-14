<div dir="rtl">

# فيديو المحاكاة — إعادة الإنتاج

الفيديو تسجيل حقيقي للتطبيق العامل: سكربت Playwright يضغط أزرار التطبيق نفسها (وفي خطوات متكررة قليلة يستخدم مشغّل السيناريو المدمج `runTo`)، مع تعليق صوتي عربي مولّد محليًا وترجمة عربية.

| الملف | الغرض |
|---|---|
| `narration.json` | النص الصوتي: `caption` للترجمة على الشاشة و`tts` بالتشكيل لتوجيه النطق |
| `tts.py` | توليد مقطع WAV لكل سطر بمحرك **Piper** محليًا دون إنترنت |
| `record.mjs` | تشغيل المتصفح وتنفيذ المشاهد وتسجيل الشاشة 1280×720 وحفظ توقيت كل سطر |
| `mux.py` | تركيب الصوت على التوقيتات المسجلة، وإنتاج MP4 مع مسار ترجمة، وملفات `.srt` و`.vtt` |

## المتطلبات

- Node 20+، وChromium (يُمرَّر مساره عبر `CHROMIUM_PATH`)، وffmpeg مع libx264.
- Python 3 مع `pip install piper-tts`.
- نموذج الصوت العربي `ar_JO-kareem-medium` (ملفا `.onnx` و`.onnx.json`) من مستودع أصوات Piper. **النموذج غير مضمّن في المستودع**؛ راجع ترخيصه وبطاقة بياناته قبل إعادة الاستخدام.

## الخطوات

```bash
npm ci && npm run build && npx vite preview --port 4173 &
python3 recordings/tts.py /path/to/ar_JO-kareem-medium.onnx recordings/out/tts 0.78
CHROMIUM_PATH=/path/to/chrome node recordings/record.mjs http://localhost:4173/ recordings/out/tts recordings/out
python3 recordings/mux.py recordings/out recordings/out/tts recordings/out/hadath-simulation.mp4
```

### نسخة إنجليزية دون صوت

واجهة إنجليزية، وترجمة إنجليزية ظاهرة على الشاشة، ومساران للترجمة (إنجليزي ثم عربي) دون تعليق صوتي. لا تحتاج Piper:

```bash
VIDEO_LANG=en CHROMIUM_PATH=/path/to/chrome node recordings/record.mjs http://localhost:4173/ - recordings/out-en
python3 recordings/mux.py recordings/out-en - recordings/out-en/hadath-simulation-en.mp4
```

يُعرض كل سطر مدة قراءة تُحسب من طوله (بين 4.5 و9 ثوانٍ).

يتحقق `record.mjs` في النهاية من عدم ظهور أي رسالة رفض في التطبيق ومن أن حالة الحدث `closed`، ويكتبها في `out/timeline.json`.

</div>

---

**English:** the video is a real recording of the running app — a Playwright script clicks the app's own buttons (and uses the built-in scenario player `runTo` for a few repetitive steps), with Arabic narration generated locally by Piper and Arabic subtitles. Steps above. For a silent English cut with English + Arabic subtitle tracks, run with `VIDEO_LANG=en` and pass `-` instead of the TTS directory (no Piper needed). The Piper Arabic voice model is not bundled — check its license before reuse.
