import express from 'express';
import { CONFIG } from './config';
import { handleWebhook } from './webhook'; // We will create this next

export const startServer = () => {
  const app = express();
  
  // Middleware to parse JSON (though Google sends headers mostly, and body might not be JSON in verification)
  app.use(express.json());

  app.post('/webhook', handleWebhook);

  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

  return app.listen(CONFIG.PORT, () => {
    console.log(`Server listening on port ${CONFIG.PORT}`);
    console.log(`Webhook URL should be: ${CONFIG.WEBHOOK_BASE_URL}/webhook`);
  });
};
