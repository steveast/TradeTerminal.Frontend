'use client';

import React, { useCallback, useRef } from 'react';
import {
  SciChartReact,
  TResolvedReturnType,
} from 'scichart-react';
import {
  simpleBinanceRestClient,
  TPriceBar,
} from '../vendor/binance/binanceRestClient';
import {
  binanceSocketClient,
  TRealtimePriceBar,
} from '../vendor/binance/binanceSocketClient';
import { createCandlestickChart } from '../vendor/chart/createCandlestickChart';
import {
  SciChartSurface,
  HorizontalLineAnnotation,
  BoxAnnotation,
  ECoordinateMode,
  EAnnotationLayer,
  NumericAxis,
  ELabelPlacement,
} from 'scichart';

const SYMBOL = 'BTCUSDT';
const TIMEFRAME = '4h';
const INITIAL_LIMIT = 1000;
const VISIBLE_HOURS = 200;

export default function Chart() {
  const entryAnnotationRef = useRef<HorizontalLineAnnotation | null>(null);
  const stopAnnotationRef = useRef<HorizontalLineAnnotation | null>(null);
  const takeProfitAnnotationRef = useRef<HorizontalLineAnnotation | null>(null);
  const zoneAnnotationRef = useRef<BoxAnnotation | null>(null);

  const isDraggingRef = useRef(false);
  const entryPriceRef = useRef<number | null>(null);

  const initChart = useCallback(async (rootElement: HTMLDivElement) => {
    const { sciChartSurface, controls } = await createCandlestickChart(rootElement);

    const yAxis = sciChartSurface.yAxes.get(0) as NumericAxis;

    // === Загрузка исторических данных ===
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setHours(endDate.getHours() - INITIAL_LIMIT);

    const priceBars: TPriceBar[] = await simpleBinanceRestClient.getCandles(
      SYMBOL,
      TIMEFRAME,
      startDate,
      endDate,
      INITIAL_LIMIT,
      'com'
    );

    controls.setData(`${SYMBOL.replace('USDT', '/USDT')}`, priceBars);

    const visibleStart = new Date(endDate);
    visibleStart.setHours(endDate.getHours() - VISIBLE_HOURS);
    const visibleEnd = new Date(endDate);
    visibleEnd.setHours(endDate.getHours() + 20);

    controls.setXRange(visibleStart, visibleEnd);

    // === Реал-тайм обновления ===
    const realtimeObservable = binanceSocketClient.getRealtimeCandleStream(SYMBOL, TIMEFRAME);

    const subscription = realtimeObservable.subscribe((realtimeBar: TRealtimePriceBar) => {
      const priceBar = {
        date: realtimeBar.openTime,
        open: realtimeBar.open,
        high: realtimeBar.high,
        low: realtimeBar.low,
        close: realtimeBar.close,
        volume: realtimeBar.volume,
      };
      controls.onNewTrade(priceBar);
    });

    // === Ждём первый рендер ===
    await sciChartSurface.zoomExtents();

    // === Аннотации ===
    const clearAnnotations = () => {
      [entryAnnotationRef, stopAnnotationRef, zoneAnnotationRef, takeProfitAnnotationRef].forEach((ref) => {
        if (ref.current) {
          sciChartSurface.annotations.remove(ref.current);
          ref.current = null;
        }
      });
    };

    const createHorizontalLine = (price: number, label: string, color: string, isDashed = false, entry: number, stop: number, isStop: boolean) => {
      const isLong = entry > stop;
      let labelPlacement;

      if (!isStop) {
        if (isLong) {
          labelPlacement = ELabelPlacement.TopLeft;
        } else {
          labelPlacement = ELabelPlacement.BottomLeft;
        }
      }
      if (isStop) {
        if (isLong) {
          labelPlacement = ELabelPlacement.BottomLeft;
        } else {
          labelPlacement = ELabelPlacement.TopLeft;
        }
      }

      return new HorizontalLineAnnotation({
        y1: price,
        stroke: `${color}CC`,
        strokeThickness: 1,
        strokeDashArray: isDashed ? [6, 4] : undefined,
        showLabel: true,
        labelPlacement,
        axisFontSize: 12,
        labelValue: `${label}: ${price.toFixed(2)}`,
        axisLabelFill: `${color}80`,
        isEditable: false,
        annotationLayer: EAnnotationLayer.BelowChart,
      });
    };

    const createZone = (entry: number, stop: number) => {
      return new BoxAnnotation({
        x1: 0,
        x2: 1,
        y1: Math.min(entry, stop),
        y2: Math.max(entry, stop),
        xCoordinateMode: ECoordinateMode.Relative,
        yCoordinateMode: ECoordinateMode.DataValue,
        fill: 'rgba(255, 0, 0, 0.05)',
        strokeThickness: 0,
        isEditable: false,
        annotationLayer: EAnnotationLayer.BelowChart,
      });
    };

    const updateAnnotations = (entry: number, current: number) => {
      clearAnnotations();
      const tpPrice = entry + (entry - current) * 3;

      const entryLine = createHorizontalLine(entry, 'Entry', '#00ff00', false, entry, current, false);
      const stopLine = createHorizontalLine(current, 'Stop Loss', '#ff0000', true, entry, current, true);
      const takeProfitLine = createHorizontalLine(tpPrice, 'Take profit', '#d4ff00', true, entry, current, false);

      sciChartSurface.annotations.add(entryLine);
      sciChartSurface.annotations.add(stopLine);
      sciChartSurface.annotations.add(takeProfitLine);

      const zone = createZone(entry, current);
      sciChartSurface.annotations.add(zone);

      entryAnnotationRef.current = entryLine;
      stopAnnotationRef.current = stopLine;
      takeProfitAnnotationRef.current = takeProfitLine;
      zoneAnnotationRef.current = zone;
    };

    // === ПРАВАЯ КНОПКА МЫШИ (на canvas для точности) ===
    const canvas = sciChartSurface.domCanvas2D;
    if (!canvas) {
      console.error('Canvas not found');
      return { sciChartSurface, subscription, controls };
    }

    const getPriceFromEvent = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();

      // 1. Получаем физические пиксели (с учетом DPI)
      const pixelRatio = window.devicePixelRatio || 1;
      const canvasX = (e.clientX - rect.left) * pixelRatio;
      const canvasY = (e.clientY - rect.top) * pixelRatio;

      // 2. Получаем область отрисовки (SeriesViewRect)
      const viewRect = sciChartSurface.seriesViewRect;

      // 3. Вычисляем Y относительно области данных
      // Важно: CoordinateCalculator в 4.x работает с физическими пикселями
      const yInViewRect = canvasY - viewRect.top;

      return yAxis.getCurrentCoordinateCalculator().getDataValue(yInViewRect);
    };

    const onMouseDown = (e: MouseEvent) => {
      const price = getPriceFromEvent(e);

      if (e.button !== 0) {
        console.log(price);
      }
      if (e.button !== 2) { return; }
      e.preventDefault();

      entryPriceRef.current = price;
      isDraggingRef.current = true;

      // Очищаем старое, если было
      clearAnnotations();

      // Инициализируем аннотации сразу. 
      // На момент нажатия Stop Loss равен Entry (нулевая зона)
      updateAnnotations(price, price);

      console.log('ПКМ нажата: Entry зафиксирован', price.toFixed(2));
    };

    // Внутри onMouseMove
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || entryPriceRef.current === null) { return; }

      const currentPrice = getPriceFromEvent(e);
      updateAnnotations(entryPriceRef.current, currentPrice);
    };

    const onMouseUpOrLeave = () => {
      if (isDraggingRef.current && entryPriceRef.current !== null) {
        const finalStop = stopAnnotationRef.current?.y1 as number | undefined;
        const finalTp = takeProfitAnnotationRef.current?.y1 as number | undefined;
        if (finalStop !== undefined && finalTp) {
          console.log('=== ПОЗИЦИЯ ГОТОВА ===');
          console.log('Entry:', entryPriceRef.current.toFixed(2));
          console.log('Stop Loss:', finalStop.toFixed(2));
          console.log('Take profit:', finalTp.toFixed(2));
          console.log('Направление:', entryPriceRef.current > finalStop ? 'LONG' : 'SHORT');
          console.log('Риск:', Math.abs(entryPriceRef.current - finalStop).toFixed(2));
        }
      }
      isDraggingRef.current = false;
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUpOrLeave);
    canvas.addEventListener('mouseleave', onMouseUpOrLeave);
    canvas.addEventListener('contextmenu', onContextMenu);

    const cleanupMouse = () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUpOrLeave);
      canvas.removeEventListener('mouseleave', onMouseUpOrLeave);
      canvas.removeEventListener('contextmenu', onContextMenu);
      clearAnnotations();
    };

    return {
      sciChartSurface,
      subscription,
      controls,
      cleanup: cleanupMouse,
    };
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex', position: 'relative' }}>
      <SciChartReact
        initChart={initChart}
        onInit={(initResult: TResolvedReturnType<typeof initChart>) => {
          const { subscription, cleanup } = initResult;

          return () => {
            subscription.unsubscribe();
            cleanup?.();
          };
        }}
        style={{ flex: 'auto', width: '75vw' }}
        innerContainerProps={{ style: { flexGrow: 1 } }}
      />
    </div>
  );
}