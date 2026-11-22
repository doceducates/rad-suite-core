import { Node, mergeAttributes } from '@tiptap/core';

export type CalloutType = 'critical' | 'recommendation' | 'normal' | 'info';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attributes?: { type?: CalloutType }) => ReturnType;
      toggleCallout: (attributes?: { type?: CalloutType }) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

export const ClinicalCalloutExtension = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (element) => element.getAttribute('data-callout-type') || 'info',
        renderHTML: (attributes) => ({
          'data-callout-type': attributes.type,
          class: getCalloutClasses(attributes.type),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-callout-type]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setCallout:
        (attributes) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attributes);
        },
      toggleCallout:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, attributes);
        },
      unsetCallout:
        () =>
        ({ commands }) => {
          return commands.lift(this.name);
        },
    };
  },
});

function getCalloutClasses(type: CalloutType): string {
  switch (type) {
    case 'critical':
      return 'callout-critical border-l-4 border-rose-500 bg-rose-500/10 dark:bg-rose-950/20 text-foreground p-3 rounded-r-lg my-2 shadow-xs';
    case 'recommendation':
      return 'callout-recommendation border-l-4 border-secondary bg-secondary/10 text-foreground p-3 rounded-r-lg my-2 shadow-xs';
    case 'normal':
      return 'callout-normal border-l-4 border-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/20 text-foreground p-3 rounded-r-lg my-2 shadow-xs';
    default:
      return 'callout-info border-l-4 border-primary bg-primary/5 text-foreground p-3 rounded-r-lg my-2 shadow-xs';
  }
}
