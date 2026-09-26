import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      host: true,
      allowedHosts: true
    },
    plugins: [
      react(),
      {
        name: 'discord-token-exchange',
        configureServer(server) {
          server.middlewares.use('/api/token', async (req, res) => {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', async () => {
                try {
                  const { code } = JSON.parse(body);
                  
                  const response = await fetch('https://discord.com/api/oauth2/token', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                      client_id: env.VITE_DISCORD_CLIENT_ID,
                      client_secret: env.DISCORD_CLIENT_SECRET,
                      grant_type: 'authorization_code',
                      code: code,
                    }).toString(),
                  });

                  const data = await response.json();
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = response.status;
                  res.end(JSON.stringify(data));
                } catch (err) {
                  console.error(err);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
            } else {
              res.statusCode = 405;
              res.end();
            }
          });
        }
      }
    ],
  };
});
