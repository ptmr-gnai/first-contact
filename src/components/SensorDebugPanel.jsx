/**
 * SensorDebugPanel — Shows live sensor data for debugging.
 * 
 * Usage: Add <SensorDebugPanel /> anywhere in your app.
 */

import { useSensorStream } from '../bridge/useSensorStream';

export default function SensorDebugPanel() {
  const { sensorData, connected } = useSensorStream();

  if (!connected) {
    return (
      <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg font-mono text-sm">
        <div className="text-yellow-400">⚠️ Sensor bridge disconnected</div>
        <div className="text-gray-400 text-xs mt-1">
          Run: python -m bridge.run
        </div>
      </div>
    );
  }

  if (!sensorData) {
    return (
      <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg font-mono text-sm">
        <div className="text-gray-400">Waiting for sensor data...</div>
      </div>
    );
  }

  const { sensors } = sensorData;
  const hr = sensors.heart_rate;
  const gesture = sensors.gesture;
  const accel = sensors.accelerometer;

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg font-mono text-sm min-w-[200px]">
      <div className="text-green-400 mb-2">🟢 Sensors Connected</div>
      
      {/* Heart Rate */}
      <div className={`mb-2 ${hr?.stale ? 'opacity-50' : ''}`}>
        <span className="text-red-400">❤️</span>{' '}
        {hr?.connected ? (
          <span>{hr.data?.bpm ?? '--'} BPM</span>
        ) : (
          <span className="text-gray-500">disconnected</span>
        )}
        {hr?.stale && <span className="text-yellow-400 ml-1">⚠️</span>}
      </div>

      {/* Gesture */}
      <div className={`mb-2 ${gesture?.stale ? 'opacity-50' : ''}`}>
        <span>🤚</span>{' '}
        {gesture?.connected ? (
          <span>
            {gesture.data?.gesture ?? 'None'}
            {gesture.data?.confidence > 0 && (
              <span className="text-gray-400 ml-1">
                ({Math.round(gesture.data.confidence * 100)}%)
              </span>
            )}
          </span>
        ) : (
          <span className="text-gray-500">disconnected</span>
        )}
      </div>

      {/* Accelerometer */}
      <div className={`text-xs text-gray-400 ${accel?.stale ? 'opacity-50' : ''}`}>
        <span>📐</span>{' '}
        {accel?.connected ? (
          <span>
            x:{accel.data?.x ?? 0} y:{accel.data?.y ?? 0} z:{accel.data?.z ?? 0}
          </span>
        ) : (
          <span>disconnected</span>
        )}
      </div>
    </div>
  );
}
