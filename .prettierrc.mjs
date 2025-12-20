/** @type {import("@ianvs/prettier-plugin-sort-imports").PrettierConfig} */
const config = {
  // Основные настройки
  printWidth: 100, // Хорошо для читаемости на больших экранах
  tabWidth: 2,
  useTabs: false,
  singleQuote: true, // Современный стиль (JS/TS сообщество предпочитает ' )
  quoteProps: 'as-needed',
  jsxSingleQuote: false,
  trailingComma: 'es5', // es5 — безопасный компромисс (запятая в объектах/массивах, но не в параметрах функций)
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always', // Лучше для читаемости: (a) => {} вместо a => {}
  endOfLine: 'lf', // Unix-style, стандарт в 2025

  // Плагин для сортировки импортов
  plugins: ['@ianvs/prettier-plugin-sort-imports'],

  // Порядок импортов — отличный, чуть улучшим
  importOrder: [
    // 1. Стили на самом верху
    '.*\\.css$',

    // 2. Пустая строка
    '',

    // 3. Встроенные Node модули (если есть)
    '<BUILTIN_MODULES>',

    // 4. React и Next.js — самые важные
    '^react$',
    '^next$',
    '^next/(.*)$',

    // 5. Dayjs (часто используется в Mantine)
    '^dayjs',

    // 6. Все третьесторонние пакеты
    '<THIRD_PARTY_MODULES>',

    // 7. Mantine и связанные пакеты
    '^@mantine/(.*)$',
    '^@mantinex/(.*)$',
    '^@mantine-tests/(.*)$',

    // 8. Документация и внутренние алиасы
    '^@docs/(.*)$',

    // 9. Локальные импорты из src
    '^@/(.*)$',

    // 10. Родительские импорты (../)
    '^\\.\\./(.*)$',

    // 11. Текущая папка (./)
    '^\\./(.*)$',

    // 12. Стили в конце (если не попали под первый пункт)
    '\\.css$',
  ],

  // Опционально: разделять группы пустыми строками
  importOrderSeparation: true,
  importOrderSortSpecifiers: true, // Сортировать named imports: import { b, a } → { a, b }
  importOrderCaseInsensitive: true, // Игнорировать регистр при сортировке

  // Переопределения для специфических файлов
  overrides: [
    {
      files: '*.mdx',
      options: {
        printWidth: 70, // MDX читается лучше с короткими строками
      },
    },
    {
      files: ['*.json', '*.yaml', '*.yml'],
      options: {
        printWidth: 80,
      },
    },
  ],
};

export default config;
