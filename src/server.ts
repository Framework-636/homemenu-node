import { app } from './app.ts';

const PORT = Number(process.env.PORT) || 3000;
// 127.0.0.1 = only this machine can connect (Apache, in production).
// Docker sets HOST=0.0.0.0, because inside a container the port must be reachable from outside it.
const HOST = process.env.HOST || '127.0.0.1';

app.listen(PORT, HOST, () => {
  console.log(`HomeMenu API running at http://${HOST}:${PORT}`);
});