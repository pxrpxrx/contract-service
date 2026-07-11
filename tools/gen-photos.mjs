import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const MODEL = process.env.POLL_MODEL || "flux";
const OUT_DIR = process.argv[2] || "assets/images";

const JOBS = [
  {
    file: "hero-soldier.jpg",
    w: 1024,
    h: 1280,
    seed: 14822,
    prompt:
      "Cinematic full-length environmental portrait of a Russian soldier in modern tactical gear standing alone on a foggy hill at dawn, dramatic side rim light, deep atmospheric perspective, moody desaturated teal and warm amber tones, subtle film grain, high-end editorial photography, photorealistic, sharp focus, no text, no logos",
  },
  {
    file: "unit-bpla.jpg",
    w: 1280,
    h: 1024,
    seed: 88231,
    prompt:
      "Close-up of a focused military drone operator hands on a controller with a small quadcopter FPV drone, dim interior, cool muted tones, shallow depth of field, calm documentary photography, photorealistic, restrained, no text, no logos",
  },
  {
    file: "map-russia.jpg",
    w: 1280,
    h: 1024,
    seed: 55109,
    prompt:
      "Minimal clean map of Russia as a single elegant silhouette, muted slate-grey on a soft warm off-white paper background, a single small brass-gold location pin marker, subtle thin contour lines, refined editorial infographic style, flat, no text",
  },
  {
    file: "hero-bg.jpg",
    w: 1600,
    h: 1200,
    seed: 30774,
    prompt:
      "Very subtle abstract dark textured background, faint diagonal brushed lines in near-black and deep charcoal, a barely visible thin brass-gold diagonal streak, lots of empty negative space, understated premium photography backdrop, no text, no people",
  },
  {
    file: "cta-banner.jpg",
    w: 1600,
    h: 900,
    seed: 77331,
    prompt:
      "Wide cinematic shot of three male Russian soldiers in full tactical uniform and helmets standing in calm formation at dusk, golden-hour side light from the left, muted desaturated olive and steel tones, atmospheric and dignified, restrained editorial documentary photography, photorealistic, sharp focus on the soldiers, soft out-of-focus background, no text, no logos",
  },
];

mkdirSync(OUT_DIR, { recursive: true });

for (const job of JOBS) {
  const enc = encodeURIComponent(job.prompt);
  const url = `https://image.pollinations.ai/prompt/${enc}?width=${job.w}&height=${job.h}&nologo=true&model=${MODEL}&seed=${job.seed}`;
  const out = `${OUT_DIR}/${job.file}`;
  process.stdout.write(`Generating ${job.file} (${job.w}x${job.h})... `);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`FAILED HTTP ${res.status}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, buf);
    console.log(`OK ${(buf.length / 1024).toFixed(0)}KB`);
  } catch (e) {
    console.log(`ERROR ${e.message}`);
  }
}
console.log("Done.");
