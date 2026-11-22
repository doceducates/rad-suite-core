'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Compass,
  BookOpen,
  Award,
  Sparkles,
  Layers,
  ArrowRight,
  Flame,
  Brain,
  Heart,
  Activity,
  Bone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AtlasStudentSearch } from './atlas-student-search';
import type { AnatomyModuleSummary } from '@/types';

interface AtlasStudentDashboardProps {
  userName?: string;
  userRole?: string;
  modules: AnatomyModuleSummary[];
}

const REGION_TABS = [
  { id: 'all', label: 'All Modules' },
  { id: 'head_neck', label: 'Head & Neck', icon: Brain },
  { id: 'thorax', label: 'Thorax', icon: Heart },
  { id: 'abdomen', label: 'Abdomen & Pelvis', icon: Activity },
  { id: 'spine', label: 'Spine & MSK', icon: Bone },
];

export function AtlasStudentDashboard({
  userName = 'Student',
  modules = [],
}: AtlasStudentDashboardProps) {
  const [selectedRegion, setSelectedRegion] = useState('all');

  const filteredModules = useMemo(() => {
    if (selectedRegion === 'all') return modules;
    return modules.filter((m) => {
      const reg = (m.region || '').toLowerCase();
      if (selectedRegion === 'head_neck') return reg.includes('head') || reg.includes('neck') || reg.includes('brain');
      if (selectedRegion === 'thorax') return reg.includes('thorax') || reg.includes('chest') || reg.includes('heart');
      if (selectedRegion === 'abdomen') return reg.includes('abdomen') || reg.includes('pelvis');
      if (selectedRegion === 'spine') return reg.includes('spine') || reg.includes('limb') || reg.includes('msk');
      return true;
    });
  }, [modules, selectedRegion]);

  const totalSlices = useMemo(() => {
    return modules.reduce((sum, m) => sum + (Number(m.total_slices) || 0), 0);
  }, [modules]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner / Hero Header */}
      <div className="relative rounded-3xl overflow-hidden border border-emerald-500/20 bg-linear-to-br from-emerald-500/10 via-card to-card p-6 sm:p-8 backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>DocEducates Anatomy Academy &bull; Student Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-headline font-bold text-foreground">
              Welcome back, {userName}
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Master clinical cross-sectional anatomy with 14,089 real diagnostic slices,
              bilingual Terminologia Anatomica, and active self-quizzing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-border text-xs font-medium">
              <Flame className="w-4 h-4 text-amber-500" />
              <div>
                <span className="text-foreground font-bold">5-Day</span> Streak
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-border text-xs font-medium">
              <Award className="w-4 h-4 text-emerald-500" />
              <div>
                <span className="text-foreground font-bold">Explorer</span> Level 1
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-6 pt-6 border-t border-border/50">
          <AtlasStudentSearch />
        </div>
      </div>

      {/* Quick Action Study Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-border/60 bg-card/70 hover:border-emerald-500/40 transition-all hover:shadow-lg hover:shadow-emerald-500/5 group">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Interactive
            </span>
          </CardHeader>
          <CardContent className="space-y-2">
            <CardTitle className="text-base font-semibold text-foreground">
              Cross-Sectional Viewer
            </CardTitle>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Scrub multi-planar CT and MRI slices with linked scout lines and 2,919 pins.
            </p>
            <div className="pt-2">
              <Link href="/atlas">
                <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs">
                  <span>Open Full Atlas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70 hover:border-teal-500/40 transition-all hover:shadow-lg hover:shadow-teal-500/5 group">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">
              Active Recall
            </span>
          </CardHeader>
          <CardContent className="space-y-2">
            <CardTitle className="text-base font-semibold text-foreground">
              Daily Self-Quiz Challenge
            </CardTitle>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mask anatomical labels into [ ? ] badges and test your recall against real slices.
            </p>
            <div className="pt-2">
              <Link href="/atlas">
                <Button size="sm" variant="outline" className="w-full border-teal-500/40 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 gap-1.5 text-xs">
                  <span>Start Practice Quiz</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70 hover:border-sky-500/40 transition-all hover:shadow-lg hover:shadow-sky-500/5 group">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400">
              Overview
            </span>
          </CardHeader>
          <CardContent className="space-y-2">
            <CardTitle className="text-base font-semibold text-foreground">
              Anatomy Repository
            </CardTitle>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {modules.length} modules, {totalSlices.toLocaleString()} slices, verified by radiologists.
            </p>
            <div className="pt-2">
              <Link href="/atlas">
                <Button size="sm" variant="ghost" className="w-full text-muted-foreground hover:text-foreground gap-1.5 text-xs">
                  <span>Browse All Series</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regional Modules Explorer */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-headline font-bold text-foreground">
              Anatomical Modules
            </h2>
            <p className="text-xs text-muted-foreground">
              Select a module to load real-time cross-sectional slices and segmentations.
            </p>
          </div>

          {/* Region Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {REGION_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedRegion(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                  selectedRegion === tab.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-card text-muted-foreground hover:text-foreground border border-border/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredModules.map((mod) => (
            <Link
              key={mod.id || mod.code}
              href={`/atlas`}
              className="group rounded-2xl border border-border/70 bg-card/60 p-4 hover:border-emerald-500/40 hover:bg-card/90 transition-all duration-200 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {mod.region || 'Anatomy'}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    {mod.total_slices || 0} slices
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-foreground group-hover:text-emerald-500 transition-colors line-clamp-1">
                  {mod.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {mod.series_count || 1} series available in high-resolution MPR.
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground group-hover:text-foreground">
                <span>Open in Atlas</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-500 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
