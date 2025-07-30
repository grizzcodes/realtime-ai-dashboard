// File: frontend/src/components/IntegrationStatus.tsx

import { useEffect, useState } from 'react';

const integrations = [
  { name: 'Gmail', api: '/api/status/gmail' },
  { name: 'Slack', api: '/api/status/slack' },
  { name: 'Calendar', api: '/api/status/calendar' },
  { name: 'Notion', api: '/api/status/notion' },
  { name: 'OpenAI', api: '/api/status/openai' },
  { name: 'Claude', api: '/api/status/claude' },
  { name: 'Fireflies', api: '/api/status/fireflies' },
];

export default function IntegrationStatus() {
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    integrations.forEach(async (integration) => {
      try {
        const res = await fetch(integration.api);
        const data = await res.json();
        setStatuses((prev) => ({ ...prev, [integration.name]: data.status === 'ok' }));
      } catch (err) {
        setStatuses((prev) => ({ ...prev, [integration.name]: false }));
      }
    });
  }, []);

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-lg font-semibold mb-4">Integration Status</h2>
      <ul>
        {integrations.map(({ name }) => (
          <li key={name} className="flex items-center justify-between mb-2">
            <span>{name}</span>
            <span className={`w-3 h-3 rounded-full ${statuses[name] ? 'bg-green-500' : 'bg-red-500'}`}></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
