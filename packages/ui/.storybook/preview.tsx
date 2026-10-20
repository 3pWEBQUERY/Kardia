import type { Preview } from '@storybook/react-vite';

import './preview.css';

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Hell/Dunkel',
      toolbar: { items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, ctx) => {
      document.documentElement.dataset.theme = String(ctx.globals.theme ?? 'light');
      return (
        <div className="bg-surface-50 p-6 text-ink-900">
          <Story />
        </div>
      );
    },
  ],
  parameters: { layout: 'fullscreen', controls: { expanded: true } },
};

export default preview;
