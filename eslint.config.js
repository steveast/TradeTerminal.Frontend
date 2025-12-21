// eslint.config.js
import mantine from 'eslint-config-mantine';
import perfectionist from 'eslint-plugin-perfectionist';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  // Рекомендуемые правила TypeScript
  ...tseslint.configs.recommended,

  // Конфиг Mantine (react, jsx-a11y, import и т.д.)
  ...mantine,

  {
    plugins: {
      perfectionist,
    },
  },

  // Глобальные игноры
  {
    ignores: ['**/*.{mjs,cjs,js,d.ts,d.mts}', 'dist/', 'build/', '.next/', 'node_modules/'],
  },

  // Отключаем no-console в сторибуках (и вообще везде — см. ниже)
  {
    files: ['**/*.story.tsx', '**/*.stories.tsx'],
    rules: {
      'no-console': 'off',
    },
  },

  // Настройки для type-aware линтинга (если захочешь включить — раскомментируй блок в конце)
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // === ОТКЛЮЧАЕМ ЗАПРОШЕННЫЕ ПРАВИЛА ГЛОБАЛЬНО ===
  {
    rules: {
      // Полностью отключаем запрет на console.log, console.error и т.д.
      'no-console': 'off',

      // Отключаем проверку неиспользуемых переменных (и в JS, и в TS)
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',

      // Отключаем запрет на переприсваивание параметров функции
      'no-param-reassign': 'off',

      // Дополнительно полезные ослабления (по желанию оставь или удали)
      '@typescript-eslint/no-explicit-any': 'warn', // или 'off', если хочешь полностью разрешить any

      quotes: ['error', 'single', { avoidEscape: true }],
      'jsx-quotes': ['error', 'prefer-double'],
      'perfectionist/sort-interfaces': [
        'error',
        {
          type: 'alphabetical',
          order: 'asc',
          ignoreCase: true,
        },
      ],
      'perfectionist/sort-object-types': [
        'error',
        {
          type: 'alphabetical',
          order: 'asc',
          ignoreCase: true,
        },
      ],
    },
  }

  // Опционально: более строгие type-checked правила (рекомендую включить позже)
  // {
  //   files: ['**/*.ts', '**/*.tsx'],
  //   ...tseslint.configs.recommendedTypeChecked,
  //   languageOptions: {
  //     parserOptions: {
  //       project: './tsconfig.json',
  //       tsconfigRootDir: import.meta.dirname,
  //     },
  //   },
  // },
);
