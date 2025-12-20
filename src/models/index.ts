'use client'; // Это нормально, если файл используется только на клиенте

import { createContext, useContext } from 'react';
import { TerminalModel } from './TerminalModel';

// Определяем тип для ваших моделей
export type Models = {
  terminalModel: TerminalModel;
};

// Создаём экземпляр
export const models: Models = {
  terminalModel: new TerminalModel(),
};

// Создаём контекст с правильной типизацией
// Важно: передаём undefined как default value, а тип явно указываем
export const ModelsContext = createContext<Models | undefined>(undefined);

// Хук для удобного использования с проверкой
export const useModels = (): Models => {
  const context = useContext(ModelsContext);
  if (context === undefined) {
    throw new Error('useModels must be used within a ModelsProvider');
  }
  return context;
};