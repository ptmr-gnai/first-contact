import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = 'ws://localhost:8787';
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 2000;

/**
 * @param {{ onAlienResponse: (response: object) => void, enabled?: boolean }} options
 * @returns {{ sendInput: (playerInput: object) => void, isConnected: boolean, error: string | null }}
 */
export function useBridge({ onAlienResponse, enabled = true }) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const onAlienResponseRef = useRef(onAlienResponse);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    onAlienResponseRef.current = onAlienResponse;
  }, [onAlienResponse]);

  const connect = useCallback(() => {
    if (!isMountedRef.current || !enabled) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMountedRef.current) return;
      reconnectAttemptsRef.current = 0;
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      if (!isMountedRef.current) return;
      let parsed;
      try {
        parsed = JSON.parse(event.data);
      } catch (_) {
        return;
      }
      onAlienResponseRef.current(parsed);
    };

    ws.onclose = () => {
      if (!isMountedRef.current) return;
      setIsConnected(false);
      wsRef.current = null;

      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        setError('Could not connect to bridge server after multiple attempts.');
        return;
      }

      const delay = BASE_RECONNECT_DELAY_MS * Math.pow(1.5, reconnectAttemptsRef.current);
      reconnectAttemptsRef.current += 1;

      reconnectTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) connect();
      }, delay);
    };

    ws.onerror = () => {
      if (!isMountedRef.current) return;
      setError(`WebSocket connection error (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
    };
  }, [enabled]);

  useEffect(() => {
    isMountedRef.current = true;

    if (enabled) {
      connect();
    }

    return () => {
      isMountedRef.current = false;
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, connect]);

  const sendInput = useCallback((playerInput) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setError('Not connected to bridge server.');
      return;
    }
    try {
      ws.send(JSON.stringify(playerInput));
    } catch (err) {
      setError(`Failed to send input: ${err.message}`);
    }
  }, []);

  return { sendInput, isConnected, error };
}
