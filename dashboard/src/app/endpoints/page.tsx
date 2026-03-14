import { prisma } from '@/utils/prisma';
import EndpointsList, { Endpoint } from './EndpointsList';

const MOCK_ENDPOINTS: Endpoint[] = [
  {
    id: 1,
    name: 'Default Shared Endpoint',
    network: 'N3 Mainnet',
    type: 'Shared',
    url: 'https://mainnet.neonexus.io/v1/a8f9c2e4-...',
    status: 'Active',
    requests: '1.2M',
  },
  {
    id: 2,
    name: 'GameFi Indexer Node',
    network: 'N3 Mainnet',
    type: 'Dedicated',
    url: 'https://node-tokyo-01.neonexus.io/v1/xyz...',
    status: 'Active',
    requests: '4.5M',
  },
  {
    id: 3,
    name: 'Testnet Integration',
    network: 'N3 Testnet',
    type: 'Dedicated',
    url: 'https://node-frankfurt-test.neonexus.io/v1/abc...',
    status: 'Syncing',
    requests: '0',
  }
];

export default async function EndpointsPage() {
  let endpoints: Endpoint[] = MOCK_ENDPOINTS;

  try {
    // Attempt to fetch from DB if env vars are present
    if (process.env.DATABASE_URL) {
      const data = await prisma.endpoint.findMany({
        orderBy: { createdAt: 'desc' }
      });

      if (data && data.length > 0) {
        // Map Prisma Endpoint to our component Endpoint type
        endpoints = data.map(ep => ({
          id: ep.id,
          name: ep.name,
          network: ep.network,
          type: ep.type,
          url: ep.url,
          status: ep.status,
          requests: ep.requests.toString()
        }));
      }
    }
  } catch (error) {
    console.warn('Database not configured or failed, falling back to mock data.', error);
  }

  return <EndpointsList endpoints={endpoints} />;
}
