import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'
import hooks from 'eslint-plugin-react-hooks'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  {
    plugins: { 'react-hooks': hooks },
    rules: hooks.configs.recommended.rules,
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
]

export default eslintConfig