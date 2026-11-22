'use client';

import React from 'react';
import Link from 'next/link';
import { Mic, Layers, Inbox, BookOpen, CheckSquare, ArrowUpRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function DashboardQuickLaunchpad() {
  const tools = [
    {
      title: 'Voice Lab',
      desc: 'CUDA VoiceStudio STT, Vault & Medical Vocabulary',
      href: '/studio',
      icon: Mic,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
      badge: 'Voice Lab',
    },
    {
      title: 'Anatomy Atlas',
      desc: 'Interactive 3D cross-sectional atlas',
      href: '/atlas',
      icon: BookOpen,
      color: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
      badge: 'Atlas',
    },
    {
      title: 'Intake & OCR',
      desc: 'Requisition slips & patient QR',
      href: '/intake',
      icon: Inbox,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      badge: 'Scanner',
    },
    {
      title: 'Radiopaedia Pool',
      desc: 'Differential diagnosis pearls',
      href: '/worklist?tab=radiopaedia',
      icon: BookOpen,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      badge: 'Library',
    },
    {
      title: 'My Cases',
      desc: 'Your allocated diagnostic queue',
      href: '/my-cases',
      icon: CheckSquare,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
      badge: 'Active',
    },
  ];

  return (
    <Card className="bg-surface-container-low border-outline-variant/60 shadow-xs flex flex-col h-full">
      <CardHeader className="pb-3 p-4 sm:p-5">
        <CardTitle className="text-base sm:text-lg">Productivity Launchpad</CardTitle>
        <p className="text-xs text-secondary">Quick clinical tooling and diagnostic shortcuts</p>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.title} href={tool.href} className="group block">
                <div className="p-3.5 rounded-xl bg-surface border border-outline-variant/50 hover:border-primary/50 transition-all duration-200 hover:-translate-y-0.5 shadow-2xs h-full flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg border ${tool.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container text-secondary">
                      {tool.badge}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs font-bold text-on-surface group-hover:text-primary transition-colors">
                      <span>{tool.title}</span>
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[11px] text-secondary mt-0.5 line-clamp-1">{tool.desc}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
