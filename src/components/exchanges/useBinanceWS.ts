'use client';

import { useEffect, useRef, useState } from 'react';
import {
  WebsocketBuilder,
  ConstantBackoff,
  ArrayQueue,
} from 'websocket-ts';

type Message =
  | { type: 'candle'; data: any }
  | { type: 'positions'; data: any[] }
  | { type: 'status'; data: string }
  | { type: 'symbolChanged'; symbol: string; interval: string }
  | { type: 'orderResult'; data: any }
  | { type: 'closeResult'; data: any }
  | { type: 'error'; message: string };

interface BinanceWSState {
  candle: any;
  positions: any[];
  status: string;
  currentSymbol: string;
  currentInterval: string;
  connected: boolean;
  send: (msg: any) => void;
  changeSymbol: (symbol: string, interval?: string) => void;
  marketBuy: (usdAmount: number) => void;
}

export function useBinanceWS(): BinanceWSState {
  const wsRef = useRef<any>(null); // websocket-ts instance
  const [candle, setCandle] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [status, setStatus] = useState<string>('disconnected');
  const [currentSymbol, setCurrentSymbol] = useState<string>('BTCUSDT');
  const [currentInterval, setCurrentInterval] = useState<string>('1m');
  const [connected, setConnected] = useState<boolean>(false);

  useEffect(() => {
    const url = 'ws://localhost:3001';

    const ws = new WebsocketBuilder(url)
      .withBackoff(new ConstantBackoff(2000)) // reconnect каждые 2 секунды
      .withBuffer(new ArrayQueue()) // буферизует сообщения при отключении
      .onOpen((i, ev) => {
        console.log('WS подключён');
        setConnected(true);
      })
      .onClose((i, ev) => {
        console.log('WS отключён');
        setConnected(false);
      })
      .onError((i, ev) => {
        console.error('WS ошибка:', ev);
      })
      .onMessage((i, ev) => {
        try {
          const msg: Message = JSON.parse(ev.data);

          switch (msg.type) {
            case 'candle':
              setCandle(msg.data);
              break;
            case 'positions':
              setPositions(msg.data);
              break;
            case 'status':
              setStatus(msg.data);
              break;
            case 'symbolChanged':
              setCurrentSymbol(msg.symbol);
              setCurrentInterval(msg.interval);
              break;
            case 'orderResult':
            case 'closeResult':
              console.log('Результат команды:', msg);
              // обработай как нужно (toast, обнови UI)
              break;
            case 'error':
              console.error('Ошибка от сервера:', msg.message);
              break;
          }
        } catch (e) {
          console.warn('Не удалось распарсить сообщение:', ev.data);
        }
      })
      .onRetry((i, ev) => {
        console.log('Попытка переподключения...');
      })
      .build();

    wsRef.current = ws;

    return () => {
      ws.close(); // закрываем при unmount
    };
  }, []);

  const send = (msg: any) => {
    if (wsRef.current && connected) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      console.warn('WS не подключён — сообщение не отправлено');
    }
  };

  const changeSymbol = (symbol: string, interval: string = '1m') => {
    send({
      type: 'changeSymbol',
      symbol: symbol.toUpperCase(),
      interval,
    });
  };

  // Пример отправки ордера
  const marketBuy = (usdAmount: number) => {
    send({
      type: 'marketOrder',
      payload: {
        symbol: currentSymbol,
        side: 'BUY',
        usdAmount,
        positionSide: 'LONG', // или 'BOTH' если не hedge
      },
    });
  };

  return {
    candle,
    positions,
    status,
    currentSymbol,
    currentInterval,
    connected,
    send,
    changeSymbol,
    marketBuy,
  };
}