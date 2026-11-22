import { NextResponse } from 'next/server';
import { testPacsTcpConnection, DEFAULT_LGH_PACS } from '@/services/pacs.service';
import { withAuth } from '@/lib/api-handler';
import os from 'os';

export const GET = withAuth(
  async () => {
    const interfaces = os.networkInterfaces();
    let ethernetIp = '192.168.1.150';
    let wifiIp = '192.168.0.100';

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue;
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('bridge')) {
            wifiIp = addr.address;
          } else if (name.toLowerCase().includes('ethernet')) {
            ethernetIp = addr.address;
          }
        }
      }
    }

    const pacsGateway = process.env.PACS_GATEWAY || '192.168.1.1';
    const pacsSubnet = process.env.PACS_SUBNET || '10.0.0.0 mask 255.0.0.0';
    const pacsSubnetCidr = process.env.PACS_SUBNET_CIDR || '10.0.0.0/8';
    const ping = await testPacsTcpConnection(DEFAULT_LGH_PACS.host, DEFAULT_LGH_PACS.port, 1500);

    return NextResponse.json({
      success: true,
      diagnostic: {
        ethernetIp,
        ethernetGateway: pacsGateway,
        wifiIp,
        wifiGateway: '192.168.0.1',
        pacsHost: DEFAULT_LGH_PACS.host,
        pacsPort: DEFAULT_LGH_PACS.port,
        isPacsReachable: ping.reachable,
        latencyMs: ping.latencyMs,
        hasRouteConflict: !ping.reachable,
        fixCommand: `route -p add ${pacsSubnet} ${pacsGateway}`,
        powershellCommand: `New-NetRoute -DestinationPrefix "${pacsSubnetCidr}" -NextHop "${pacsGateway}" -RouteMetric 1 -PolicyStore PersistentStore`,
      },
    });
  },
  {
    roles: ['admin'],
  }
);
