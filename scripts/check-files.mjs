import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const requiredFiles = [
  "public/index.html",
  "public/styles.css",
  "public/app.js",
  "Dockerfile",
  "nginx.conf",
  "firebase.json",
  ".github/workflows/firebase-deployment.yml",
];

await Promise.all(requiredFiles.map((file) => access(resolve(root, file))));

const firebaseConfig = JSON.parse(await readFile(resolve(root, "firebase.json"), "utf8"));
if (firebaseConfig.hosting?.public !== "dist") {
  throw new Error('firebase.json must deploy the generated "dist" directory.');
}

const html = await readFile(resolve(root, "public/index.html"), "utf8");
for (const asset of ["styles.css", "app.js"]) {
  if (!html.includes(asset)) throw new Error(`index.html does not reference ${asset}.`);
}

console.log(`Static checks passed (${requiredFiles.length} required files).`);
