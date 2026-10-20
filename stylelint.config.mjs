/** Kardia UI: verbotene Deklarationen (PRD 8.1) – Tiefe nur über Linien und Flächenkontrast. */
export default {
  extends: ['stylelint-config-standard'],
  ignoreFiles: ['**/node_modules/**', '**/.next/**', 'packages/ui/src/tokens.css'],
  rules: {
    'property-disallowed-list': ['box-shadow', 'text-shadow', 'backdrop-filter', '-webkit-backdrop-filter', 'filter'],
    'declaration-property-value-disallowed-list': {
      '/^background/': ['/gradient\\(/'],
      'background-image': ['/gradient\\(/'],
      'mask-image': ['/gradient\\(/'],
      'border-image': ['/gradient\\(/'],
    },
    'function-disallowed-list': ['linear-gradient', 'radial-gradient', 'conic-gradient', 'repeating-linear-gradient', 'repeating-radial-gradient'],
    'color-no-hex': true,
    'color-named': 'never',
    'at-rule-no-unknown': [true, { ignoreAtRules: ['theme', 'utility', 'variant', 'custom-variant', 'source', 'plugin', 'config', 'reference', 'apply', 'layer'] }],
    'import-notation': 'string',
    'custom-property-pattern': null,
    'selector-class-pattern': null,
    'no-descending-specificity': null,
    'declaration-empty-line-before': null,
    'custom-property-empty-line-before': null,
    'property-no-vendor-prefix': null,
    'value-keyword-case': ['lower', { ignoreKeywords: ['currentColor'] }],
  },
  overrides: [{ files: ['packages/ui/src/theme.css'], rules: { 'color-named': null } }],
};
