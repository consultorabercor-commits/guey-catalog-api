const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

const GOOGLE_CLOUD_PROJECT = 'bercor-ortopro-gmail';
const TOKEN = 'AQ.Ab8RN6KvdcUnO4WhUjF1kFFXCzu1a9WYT-gh5Xj_srTTK0VvQw';

async function connectToStitch() {
    const client = new Client({
        name: 'stitch-deploy-client',
        version: '1.0.0'
    });

    const transport = new StdioClientTransport({
        command: 'npx',
        args: [
            '-y',
            'stitch-mcp',
            'proxy',
            '--project',
            GOOGLE_CLOUD_PROJECT,
            '--token',
            TOKEN
        ]
    });

    await client.connect(transport);
    console.log('Conectado a Stitch MCP');

    const tools = await client.listTools();
    console.log('Herramientas disponibles:');
    for (const tool of tools.tools) {
        console.log(`  - ${tool.name}`);
    }

    return client;
}

connectToStitch().catch(console.error);
