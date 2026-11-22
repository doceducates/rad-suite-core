'use client';

import React, { useState } from 'react';
import { UnderConstructionModal } from './UnderConstructionModal';

export type GatedFeature = 'ai' | 'cloud_sync' | 'pacs_lan';

interface FeatureGateProps {
  feature: GatedFeature;
  featureTitle?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  isRestricted?: boolean;
}

export function FeatureGate({
  feature,
  featureTitle,
  children,
  fallback,
  isRestricted = true, // By default during alpha, AI and cloud sync are restricted
}: FeatureGateProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!isRestricted) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const handleClickCapture = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const category = feature === 'ai' ? 'ai' : feature === 'cloud_sync' ? 'cloud_sync' : 'general';
  const resolvedTitle =
    featureTitle ||
    (feature === 'ai'
      ? 'Clinical AI Diagnostic Lab'
      : feature === 'cloud_sync'
      ? 'Central VPS Cloud Sync'
      : 'Feature Under Construction');

  return (
    <>
      <div onClickCapture={handleClickCapture} className="contents cursor-pointer">
        {children}
      </div>

      <UnderConstructionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        featureName={resolvedTitle}
        category={category}
      />
    </>
  );
}
