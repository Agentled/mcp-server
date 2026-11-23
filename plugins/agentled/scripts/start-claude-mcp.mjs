import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
// Install only the committed lockfile. Keep npm output off the MCP stdout stream.
const install = spawnSync('npm', ['ci', '--ignore-scripts', '--omit=dev', '--no-audit', '--no-fund'], {
    cwd: root,
    stdio: ['ignore', 2, 2],
});
if (install.error || install.status !== 0) {
    process.stderr.write(`Agentled runtime installation failed: ${install.error?.message ?? `npm exited ${install.status}`}. Check Node.js, npm, network access, and plugin directory write permissions.\n`);
    process.exit(install.status || 1);
}
const server = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/@agentled/mcp-server/dist/index.js', import.meta.url))], {
    cwd: root,
    stdio: 'inherit',
});
for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => server.kill(signal));
}
server.on('error', (error) => {
    process.stderr.write(`Agentled MCP server failed to start: ${error.message}\n`);
    process.exit(1);
});
server.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
