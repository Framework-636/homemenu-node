import { app } from './app.ts';

const PORT = process.env.PORT || 3000;

// Start listening for requests
app.listen(PORT, () => {
  console.log(`HomeMenu API running at http://localhost:${PORT}`);
});