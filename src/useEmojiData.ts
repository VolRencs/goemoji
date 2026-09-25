"use client";

import { useEffect, useRef, useState } from "react";
import { parseEmojiData, type EmojiData } from "./data.ts";

export type UseEmojiDataResult = {
  data: EmojiData | null;
  error: Error | null;
  loading: boolean;
};

export function useEmojiData(
  load: () => Promise<unknown>,
  deps: readonly unknown[] = [],
): UseEmojiDataResult {
  const [result, setResult] = useState<UseEmojiDataResult>({
    data: null,
    error: null,
    loading: true,
  });
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let alive = true;
    setResult({ data: null, error: null, loading: true });
    Promise.resolve()
      .then(() => loadRef.current())
      .then((raw) => {
        if (alive) setResult({ data: parseEmojiData(raw), error: null, loading: false });
      })
      .catch((cause: unknown) => {
        if (!alive) return;
        setResult({
          data: null,
          loading: false,
          error:
            cause instanceof Error
              ? cause
              : new Error("goemoji: не удалось загрузить данные эмодзи", { cause }),
        });
      });
    return () => {
      alive = false;
    };
  }, deps);

  return result;
}
