'use client';

import React, { useCallback, useEffect, useRef } from 'react';
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
  HorizontalLineAnnotation,
  BoxAnnotation,
  ECoordinateMode,
  EAnnotationLayer,
  NumericAxis,
  ELabelPlacement,
} from 'scichart';
import { observer } from 'mobx-react-lite';
import { useModels } from '@app/models';
import { calcPercentsFromEntry } from '@app/utils/calcPercentsFromEntry';

const SYMBOL = 'BTCUSDT';
const TIMEFRAME = '4h';
const INITIAL_LIMIT = 1000;
const VISIBLE_HOURS = 200;

function Chart() {
  const { terminalModel: model } = useModels();

  const colorLong = '#00ff00';
  const colorShort = '#ff0000';
  const colorTake = '#d4ff00';
  const ratio = 3;

  const updateAnnotationsRef = useRef<(entry: number, stop: number, takePrice: number | null) => void>(() => { });
  const clearAnnotationsRef = useRef<() => void>(() => { });

  const entryAnnotationRef = useRef<HorizontalLineAnnotation | null>(null);
  const stopAnnotationRef = useRef<HorizontalLineAnnotation | null>(null);
  const takeProfitAnnotationRef = useRef<HorizontalLineAnnotation | null>(null);
  const zoneAnnotationRef = useRef<BoxAnnotation | null>(null);

  const isDraggingRef = useRef(false);
  const entryPriceRef = useRef<number | null>(null);
  const stopPriceRef = useRef<number | null>(null);
  const takePriceRef = useRef<number | null>(null);
  const currentPriceRef = useRef<number>(0);
  const positionDirectionRef = useRef<'LONG' | 'SHORT' | null>(
    model.currentPosition?.positionSide || null
  );

  const isPosition = () => Boolean(positionDirectionRef.current);
  const isLong = () => positionDirectionRef.current === 'LONG';
  const getCurrentPrice = () => currentPriceRef.current;
  const setCurrentPrice = (currentPrice: number) => {
    currentPriceRef.current = currentPrice;
    model.commit({ currentPrice });
  };

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
    setCurrentPrice(priceBars[priceBars.length - 1].close);

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
      setCurrentPrice(realtimeBar.close);
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
    clearAnnotationsRef.current = clearAnnotations;

    const createHorizontalLine = (price: number, label: string, entry: number, stop: number) => {
      const isLong = entry > stop;
      const isEntry = label === 'Entry';
      const isStop = label === 'Stop Loss';
      const isTake = label === 'Take profit';
      const color = isEntry ? colorLong : (isStop ? colorShort : colorTake);
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
      const getLabelValue = () => {
        let result = '';

        if (isEntry) {
          if (isLong) {
            result += 'Long';
          } else {
            result += 'Short';
          }
        } else {
          result = label;
        }

        result += `: ${price.toFixed(model.symbolInfo.tickSize)}`;
        result += isEntry ? ` 1:${ratio}` : '';

        if (isStop) {
          const { stop } = calcPercentsFromEntry(
            entryPriceRef.current!,
            price,
            price
          );
          result += ` ${stop}%`;
        }
        if (isTake) {
          const { takeProfit } = calcPercentsFromEntry(
            entryPriceRef.current!,
            price,
            price
          );
          result += ` ${takeProfit}%`;
        }

        return result;
      }

      return new HorizontalLineAnnotation({
        y1: price,
        stroke: `${color}CC`,
        strokeThickness: 1,
        strokeDashArray: isStop ? [4, 2] : (isTake ? [2, 2] : undefined),
        showLabel: true,
        labelPlacement,
        axisFontSize: 12,
        labelValue: getLabelValue(),
        axisLabelFill: `${color}80`,
        isEditable: !(isEntry && model.hasPosition),
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

    const updateAnnotations = (entry: number, stopPrice: number, takePrice: number | null) => {
      console.log('updateAnnotations', entry, stopPrice, takePrice);
      clearAnnotations();
      const tpPrice = takePrice || entry + (entry - stopPrice) * ratio;

      const entryLine = createHorizontalLine(entry, 'Entry', entry, stopPrice);
      const stopLine = createHorizontalLine(stopPrice, 'Stop Loss', entry, stopPrice);
      const takeProfitLine = createHorizontalLine(tpPrice, 'Take profit', entry, stopPrice);

      sciChartSurface.annotations.add(entryLine);
      sciChartSurface.annotations.add(stopLine);
      sciChartSurface.annotations.add(takeProfitLine);

      const zone = createZone(entry, stopPrice);
      sciChartSurface.annotations.add(zone);

      entryAnnotationRef.current = entryLine;
      stopAnnotationRef.current = stopLine;
      takeProfitAnnotationRef.current = takeProfitLine;
      zoneAnnotationRef.current = zone;

      // === Подписка на перетаскивание ===
      const recalculateAll = () => {
        if (!isPosition()) { return; } // если позиция ещё не создана

        const newEntry = entryLine.y1 as number;
        const newStop = stopLine.y1 as number;
        const newTp = takeProfitLine.y1 as number;
        const isLong = newEntry > newStop;
        const pc = calcPercentsFromEntry(newEntry, newStop, newTp);
        // const newTp = newEntry + (newEntry - newStop) * ratio;

        // Обновляем TP
        // takeProfitLine.y1 = newTp;
        // takeProfitLine.labelValue = `Take profit: ${newTp.toFixed(model.symbolInfo.tickSize)}`;

        // === Расчёт соотношения ===
        const risk = Math.abs(newEntry - newStop);
        const reward = Math.abs(newTp - newEntry);

        let ratioString = 'N/A';
        if (risk > 0) {
          const ratio = reward / risk;
          ratioString = `1:${ratio.toFixed(1)}`;
        }

        // Обновляем зону
        zone.y1 = Math.min(newEntry, newStop);
        zone.y2 = Math.max(newEntry, newStop);

        // Можно обновить лейблы entry/stop если нужно
        entryLine.labelValue = `${isLong ? 'Long' : 'Short'}: ${newEntry.toFixed(model.symbolInfo.tickSize)} ${ratioString}`;
        stopLine.labelValue = `Stop Loss: ${newStop.toFixed(model.symbolInfo.tickSize)} ${pc.stop}%`;
        takeProfitLine.labelValue = `Take profit: ${newTp.toFixed(model.symbolInfo.tickSize)} ${pc.takeProfit}%`;

        model.setStrategy({
          positionSide: positionDirectionRef.current!,
          entryPrice: parseFloat(newEntry.toFixed(model.symbolInfo.tickSize)),
          stopLoss: parseFloat(newStop.toFixed(model.symbolInfo.tickSize)),
          takeProfit: parseFloat(newTp.toFixed(model.symbolInfo.tickSize)),
        });

        // Перерисовка (не обязательно, SciChart обычно сам обновляет)
        sciChartSurface.invalidateElement();
      };

      const stopLossRestrict = () => {
        const currentStopY = stopLine.y1 as number;
        const currentPrice = currentPriceRef.current;
        const entryY = entryLine.y1 as number;

        if (currentPrice) {
          if (model.currentPosition) {
            if (isLong()) {
              if (currentStopY >= currentPrice) {
                stopLine.y1 = currentPrice;
              }
              if (currentStopY <= model.currentPosition.stopLoss.triggerPrice) {
                stopLine.y1 = model.currentPosition.stopLoss.triggerPrice;
              }
            } else {
              if (currentStopY <= currentPrice) {
                stopLine.y1 = currentPrice;
              }
              if (currentStopY >= model.currentPosition.stopLoss.triggerPrice) {
                stopLine.y1 = model.currentPosition.stopLoss.triggerPrice;
              }
            }
          } else {
            if (isLong() && currentStopY >= entryY) {
              stopLine.y1 = entryY;
            }
            if (!isLong() && currentStopY <= entryY) {
              stopLine.y1 = entryY;
            }
          }
        }
      }

      const takeProfitRestrict = () => {
        const currentTakeY = takeProfitLine.y1 as number;
        const currentPrice = currentPriceRef.current;

        if (currentPrice) {
          if (isLong() && currentTakeY <= currentPrice) {
            takeProfitLine.y1 = currentPrice;
          }
          if (!isLong() && currentTakeY >= currentPrice) {
            takeProfitLine.y1 = currentPrice;
          }
        }
      }

      entryLine.dragDelta.subscribe(recalculateAll);
      stopLine.dragDelta.subscribe(() => {
        stopLossRestrict();
        recalculateAll();
      });
      takeProfitLine.dragDelta.subscribe(() => {
        takeProfitRestrict();
        recalculateAll();
      });
    };

    updateAnnotationsRef.current = updateAnnotations;

    const canvas = sciChartSurface.domCanvas2D;
    if (!canvas) {
      console.error('Canvas not found');
      return { sciChartSurface, subscription, controls };
    }

    const getPriceFromEvent = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;
      const canvasY = (e.clientY - rect.top) * pixelRatio;
      const viewRect = sciChartSurface.seriesViewRect;
      // Важно: CoordinateCalculator в 4.x работает с физическими пикселями
      const yInViewRect = canvasY - viewRect.top;
      return yAxis.getCurrentCoordinateCalculator().getDataValue(yInViewRect);
    };

    const onMouseDown = (e: MouseEvent) => {
      const price = getPriceFromEvent(e);
      const isMouseLeft = e.button === 0;
      const isMouseRight = e.button === 2;

      if (isMouseLeft) {
        console.log(price, isDraggingRef.current);
      }
      if (isMouseRight && !model.hasPosition) {
        e.preventDefault();
        entryPriceRef.current = price;
        isDraggingRef.current = true;

        positionDirectionRef.current = price > currentPriceRef.current ? 'SHORT' : 'LONG';
        clearAnnotations();
        updateAnnotations(price, price, null);
        console.log('ПКМ нажата: Entry зафиксирован', price.toFixed(model.symbolInfo.tickSize));
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || entryPriceRef.current === null) { return; }

      const mousePrice = getPriceFromEvent(e);

      if (isLong() && mousePrice <= getCurrentPrice() && entryPriceRef.current >= mousePrice) {
        updateAnnotations(entryPriceRef.current, mousePrice, null);
      }
      if (!isLong() && mousePrice >= getCurrentPrice() && entryPriceRef.current <= mousePrice) {
        updateAnnotations(entryPriceRef.current, mousePrice, null);
      }
    };

    const onMouseUpOrLeave = () => {
      if (isDraggingRef.current && entryPriceRef.current !== null) {
        const finalEntry = entryPriceRef.current;
        const finalStop = stopAnnotationRef.current?.y1 as number | undefined;
        const finalTp = takeProfitAnnotationRef.current?.y1 as number | undefined;

        if (finalStop !== undefined && finalTp !== undefined) {
          // Определяем и фиксируем направление позиции
          if (finalEntry > finalStop) {
            positionDirectionRef.current = 'LONG';
          } else if (finalEntry < finalStop) {
            positionDirectionRef.current = 'SHORT';
          } else {
            // Если Stop на Entry — позиция невалидна, сбрасываем
            positionDirectionRef.current = null;
            clearAnnotations();
            console.log('Позиция не создана: Stop Loss совпадает с Entry');
            isDraggingRef.current = false;
            return;
          }

          console.log('=== ПОЗИЦИЯ СОЗДАНА ===');
          console.log('Направление:', positionDirectionRef.current);
          console.log('Entry:', finalEntry.toFixed(model.symbolInfo.tickSize));
          console.log('Stop Loss:', finalStop.toFixed(model.symbolInfo.tickSize));
          console.log('Take profit:', finalTp.toFixed(model.symbolInfo.tickSize));
          console.log('Риск:', Math.abs(finalEntry - finalStop).toFixed(model.symbolInfo.tickSize));
          model.setStrategy({
            positionSide: positionDirectionRef.current,
            entryPrice: parseFloat(finalEntry.toFixed(model.symbolInfo.tickSize)),
            stopLoss: parseFloat(finalStop.toFixed(model.symbolInfo.tickSize)),
            takeProfit: parseFloat(finalTp.toFixed(model.symbolInfo.tickSize)),
          });
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

  useEffect(() => {
    const position = model.currentPosition;
    if (position) {
      positionDirectionRef.current = position.positionSide;
      entryPriceRef.current = position.entryPrice;
      stopPriceRef.current = position.stopLoss.triggerPrice;
      takePriceRef.current = position.takeProfit.triggerPrice;
      updateAnnotationsRef.current(
        position.entryPrice,
        position.stopLoss.triggerPrice,
        position.takeProfit.triggerPrice,
      );
    } else {
      positionDirectionRef.current = null;
      clearAnnotationsRef.current();
    }
  }, [model.positions])

  return (
    <div style={{ height: '100vh', display: 'flex', position: 'relative' }}>
      <SciChartReact
        initChart={initChart}
        onInit={(initResult: TResolvedReturnType<typeof initChart>) => {
          const { subscription, cleanup } = initResult;

          model.commit({ isGraphReady: true });
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

export default observer(Chart);