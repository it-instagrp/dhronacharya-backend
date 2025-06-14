// utils/googlePlacesService.js
import axios from 'axios';

export const getGooglePlaceSuggestions = async (query) => {
  const apiKey = process.env.GOOGLE_API_KEY;

  const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
    params: {
      input: query,
      key: apiKey,
      types: '(regions)', // restricts to cities/areas
      language: 'en'
    }
  });

  return response.data.predictions.map(pred => ({
    description: pred.description,
    place_id: pred.place_id
  }));
};
