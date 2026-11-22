'use client';

import React from 'react';
import type { PluginSlotContribution, PluginSlotContext } from './plugin-types';

export type PluginComponentRenderer = React.ComponentType<{
  contribution: PluginSlotContribution;
  context?: PluginSlotContext;
}>;

class PluginClientRegistry {
  private renderers = new Map<string, PluginComponentRenderer>();

  public registerRenderer(componentName: string, renderer: PluginComponentRenderer): void {
    this.renderers.set(componentName, renderer);
  }

  public getRenderer(componentName?: string): PluginComponentRenderer | undefined {
    if (!componentName) return undefined;
    return this.renderers.get(componentName);
  }

  public hasRenderer(componentName?: string): boolean {
    if (!componentName) return false;
    return this.renderers.has(componentName);
  }
}

export const pluginClientRegistry = new PluginClientRegistry();
