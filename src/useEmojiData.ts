"use client";

import { useEffect, useRef, useState } from "react";
import { parseEmojiData, type EmojiData } from "./data.ts";

export type UseEmojiDataResult = {
  data: EmojiData | null;
  error: Error | null;
};

/**
 * Загружает slim-словарь и разбирает его.
 *
 * ```tsx
 * const { data, error } = useEmojiData(() => import("goemoji/data/ru.json"));
 * ```
 *
 * Загрузчик вызывается один раз при монтировании и заново при изменении `deps`.
 * Данные грузятся только на клиенте (в SSR вернётся `{ data: null }`).
 */
export function useEmojiData(
  load: () => Promise<unknown>,
  deps: readonly unknown[] = [],
): UseEmojiDataResult {
  const [result, setResult] = useState<UseEmojiDataResult>({ data: null, error: null });
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => loadRef.current())
      .then((raw) => {
        if (alive) setResult({ data: parseEmojiData(raw), error: null });
      })
      .catch((cause: unknown) => {
        if (!alive) return;
        setResult({
          data: null,
          error:
            cause instanceof Error
              ? cause
              : new Error("goemoji: не удалось загрузить данные эмодзи", { cause }),
        });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return result;
}
