// routes/locationRoutes.js
import express from 'express';
import { getGooglePlaceSuggestions } from '../utils/googlePlacesService.js';

const router = express.Router();

router.get('/autocomplete', async (req, res) => {
  const query = req.query.q;
  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'Query too short' });
  }

  try {
    const results = await getGooglePlaceSuggestions(query);
    res.json(results);
  } catch (error) {
    console.error('Autocomplete Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

export default router;
