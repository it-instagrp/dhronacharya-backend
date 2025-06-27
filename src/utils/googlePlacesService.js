import axios from 'axios';

export const getPlaceDetailsFromGoogle = async (place_id) => {
  const apiKey = process.env.GOOGLE_API_KEY;

  const res = await axios.get(
    'https://maps.googleapis.com/maps/api/place/details/json',
    {
      params: {
        place_id,
        key: apiKey,
        fields: 'address_component,geometry'
      }
    }
  );

  const details = res.data.result;

  const components = details.address_components;
  const get = (type) => {
    const comp = components.find(c => c.types.includes(type));
    return comp?.long_name || null;
  };

  return {
    country: get('country'),
    state: get('administrative_area_level_1'),
    city: get('locality') || get('administrative_area_level_2'),
    pincode: get('postal_code'),
    latitude: details.geometry.location.lat,
    longitude: details.geometry.location.lng
  };
};
