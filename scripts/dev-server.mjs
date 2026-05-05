import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";

const initialEnvKeys = new Set(Object.keys(process.env));

function parseEnvFile(path) {
    if (!existsSync(path)) {
        return;
    }

    const content = readFileSync(path, "utf8");

    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();

        if (!line || line.startsWith("#")) {
            continue;
        }

        const separatorIndex = line.indexOf("=");
        if (separatorIndex === -1) {
            continue;
        }

        const key = line.slice(0, separatorIndex).trim();
        let value = line.slice(separatorIndex + 1).trim();

        if (!key || initialEnvKeys.has(key)) {
            continue;
        }

        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        process.env[key] = value;
    }
}

for (const file of [".env", ".env.local", ".env.development", ".env.development.local"]) {
    parseEnvFile(join(process.cwd(), file));
}

const port = process.env.PORT || "3000";
const nextBin = process.platform === "win32" ? "node_modules\\.bin\\next.cmd" : "node_modules/.bin/next";

console.info(`[dev-server] starting Next.js dev server on port ${port}`);

const child = spawn(nextBin, ["dev", "-p", port], {
    env: process.env,
    shell: process.platform === "win32",
    stdio: "inherit",
});

child.on("exit", (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }

    process.exit(code ?? 0);
});
