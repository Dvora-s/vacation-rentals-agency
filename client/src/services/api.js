const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

const mockDelay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchFromApi(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

export async function getApartments() {
  if (USE_MOCK) {
    const { mockApartments } = await import('../data/mockApartments.js');
    await mockDelay();
    return mockApartments;
  }
  return fetchFromApi('/api/apartments');
}

export async function getApartmentById(id) {
  if (USE_MOCK) {
    const { mockApartments } = await import('../data/mockApartments.js');
    await mockDelay();
    const apartment = mockApartments.find((a) => a.id === Number(id));
    if (!apartment) {
      throw new Error('Apartment not found');
    }
    return apartment;
  }
  return fetchFromApi(`/api/apartments/${id}`);
}

export async function getFeaturedApartments(limit = 3) {
  const apartments = await getApartments();
  return apartments.filter((a) => a.is_available).slice(0, limit);
}
