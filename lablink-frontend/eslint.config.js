import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import react from 'eslint-plugin-react'

export default [
  { ignores: ['dist'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh, react },
    rules: { ...reactHooks.configs.recommended.rules, 'react/jsx-uses-vars': 'error', 'react-refresh/only-export-components': ['warn', { allowConstantExport: true }] },
  },
]
