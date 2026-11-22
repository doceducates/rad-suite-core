'use client';

import React from 'react';
import { AtlasLandingHeader } from './atlas-landing-header';
import { AtlasLandingHero } from './atlas-landing-hero';
import { AtlasFeaturesBento } from './atlas-features-bento';
import { AtlasRegionalCatalog } from './atlas-regional-catalog';
import { AtlasLandingFooter } from './atlas-landing-footer';

interface AtlasLandingViewProps {
  user?: { id: string; name: string; role: string } | null;
}

export function AtlasLandingView({ user }: AtlasLandingViewProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-emerald-500/20 selection:text-emerald-500">
      <AtlasLandingHeader user={user} />
      <main className="flex-1">
        <AtlasLandingHero />
        <AtlasFeaturesBento />
        <AtlasRegionalCatalog />
      </main>
      <AtlasLandingFooter />
    </div>
  );
}
