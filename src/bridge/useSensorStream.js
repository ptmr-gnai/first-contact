/**
 * useSensorStream — React hook for consuming sensor data from the bridge.
 * 
 * Usage:
 *   const { sensorData, connected } = useSensorStream();
 *   const hr = sensorData?.sensors.heart_rate;
 */

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * @typedef {Object} SensorReading
 * @property {Object} data - Sensor-specific data
 * @property {boolean} connected - Whether sensor is connected
 * @property {boolean} stale - Whether data is stale (>5s old)
 * @property {number} age_ms - Milliseconds since last update
 * @property {string|null} error - Error message if disconnected
 */

/**
 * @typedef {Object} SensorData
 * @property {number} timestamp - Server timestamp
 * @property {Object.<string, SensorReading>} sensors - Map of sensor readings
 */

/**
 * Hook for streaming sensor data from the Python bridge.
 * 
 * @param {Object} options
 * @param {string} [options.url] - WebSocket URL (default: ws://localhost:8000/ws/sensors)
 * @param {number} [options.reconnectInterval] - Ms between reconnect attempts (default: 2000)
 * @param {number} [options.maxReconnectAttempts] - Max reconnect attempts (default: 10)
 * @returns {{ sensorData: SensorData|null, connected: boolean, sendCommand: (cmd: Object) => void }}
 */
export function useSensorStream(options = {}) {
  const {
    url = `ws://${window.location.hostname}:8000/ws/sensors`,
    reconnectInterval = 2000,
    maxReconnectAttempts = 10,
  } = options;

  const [sensorData, setSensorData] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectCount = useRef(0);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectCount.current = 0;
      console.log('[SensorStream] Connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setSensorData(data);
    };

    ws.onclose = (event) => {
      setConnected(false);
      wsRef.current = null;
      console.log(`[SensorStream] Closed: ${event.code}`);

      if (reconnectCount.current < maxReconnectAttempts) {
        reconnectTimer.current = setTimeout(() => {
          reconnectCount.current++;
          console.log(`[SensorStream] Reconnecting (${reconnectCount.current})...`);
          connect();
        }, reconnectInterval);
      }
    };

    ws.onerror = (error) => {
      console.error('[SensorStream] Error:', error);
    };
  }, [url, reconnectInterval, maxReconnectAttempts]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close(1000, 'Component unmounted');
    };
  }, [connect]);

  const sendCommand = useCallback((cmd) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(cmd));
    }
  }, []);

  return { sensorData, connected, sendCommand };
}

export default useSensorStream;
