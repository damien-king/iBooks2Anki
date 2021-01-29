module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier/@typescript-eslint',
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  env: {
    node: true,
    es6: true,
    jest: true,
  },
  rules: {
    '@typescript-eslint/interface-name-prefix': ['error', 'always'],
    '@typescript-eslint/prefer-optional-chain': ['error'],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-use-before-define': ['error', { classes: false }],
    'no-constant-condition': ['error', { checkLoops: false }],
    'sort-imports': [
      'error',
      { memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'] },
    ],
  },
};
