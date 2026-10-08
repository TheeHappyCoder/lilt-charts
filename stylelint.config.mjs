/** Check correctness and ownership; Prettier owns formatting. */
export default {
  rules: {
    'at-rule-no-unknown': [true, { ignoreAtRules: ['theme', 'custom-variant'] }],
    'block-no-empty': true,
    'color-no-invalid-hex': true,
    'declaration-block-no-duplicate-properties': true,
    'font-family-no-duplicate-names': true,
    'function-calc-no-unspaced-operator': true,
    'keyframe-block-no-duplicate-selectors': true,
    'keyframe-declaration-no-important': true,
    'no-duplicate-at-import-rules': true,
    'no-duplicate-selectors': true,
    'no-invalid-double-slash-comments': true,
    'property-no-unknown': true,
    'selector-pseudo-class-no-unknown': true,
    'selector-pseudo-element-no-unknown': true,
  },
  overrides: [
    {
      files: ['packages/charts/src/**/*.css'],
      rules: {
        // The exceptions are the consumer-theme inputs and NumberFlow's documented hook.
        'custom-property-pattern':
          '^(?:lilt-[a-z0-9-]+|card|card-foreground|muted-foreground|border|ring|chart-[1-5]|number-flow-mask-height)$',
        'keyframes-name-pattern': '^lilt-[a-z0-9-]+$',
        'selector-class-pattern': '^(?:lilt-[a-z0-9_-]+|dark)$',
      },
    },
  ],
};
