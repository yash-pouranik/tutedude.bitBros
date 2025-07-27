// utils/geocode.js
const axios = require("axios");

async function getCoordinatesFromAddress(addressObj) {
  const { street, city, state, pincode } = addressObj;
  const fullAddress = `${street}, ${city}, ${state}, ${pincode}`;
  const encodedAddress = encodeURIComponent(fullAddress);
  const mapboxToken = process.env.MAPBOX_TOKEN; // Add this in your .env

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}`;

  try {
    const response = await axios.get(url);
    const features = response.data.features;
    if (features.length === 0) return null;

    const [longitude, latitude] = features[0].center;
    return { latitude, longitude };
  } catch (error) {
    console.error("Geocoding failed:", error);
    return null;
  }
}

module.exports = getCoordinatesFromAddress;
