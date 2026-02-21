/**
 * SensorSliceDemo — Visual demo of all three sensors working together.
 * 
 * Shows:
 * - Heart rate with pulsing animation
 * - Gesture with hand emoji
 * - Accelerometer with tilt indicator
 * 
 * Run bridge with: USE_REAL_GESTURE=1 USE_REAL_HR=1 USE_REAL_ACCEL=1 python -m bridge.run
 * Then: npm run dev
 */

import { useSensorStream } from '../bridge/useSensorStream';
import { useEffect, useState } from 'react';

const GESTURE_EMOJI = {
  'Thumb_Up': '👍',
  'Thumb_Down': '👎',
  'Closed_Fist': '✊',
  'Open_Palm': '🖐️',
  'Pointing_Up': '👆',
  'Victory': '✌️',
  'ILoveYou': '🤟',
  'None': '...',
};

export default function SensorSliceDemo() {
  const { sensorData, connected } = useSensorStream();
  const [pulse, setPulse] = useState(false);

  const hr = sensorData?.sensors?.heart_rate;
  const gesture = sensorData?.sensors?.gesture;
  const accel = sensorData?.sensors?.accelerometer;

  // Pulse animation synced to heart rate
  useEffect(() => {
    if (!hr?.data?.bpm) return;
    const interval = 60000 / hr.data.bpm; // ms per beat
    const timer = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 150);
    }, interval);
    return () => clearInterval(timer);
  }, [hr?.data?.bpm]);

  // Calculate tilt from accelerometer
  const getTilt = () => {
    if (!accel?.data) return { x: 0, y: 0 };
    const { x, y, z } = accel.data;
    // Normalize and convert to degrees (rough)
    const tiltX = Math.atan2(x, Math.sqrt(y*y + z*z)) * (180 / Math.PI);
    const tiltY = Math.atan2(y, Math.sqrt(x*x + z*z)) * (180 / Math.PI);
    return { x: Math.round(tiltX), y: Math.round(tiltY) };
  };

  const tilt = getTilt();

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔌</div>
          <div className="text-white text-xl">Sensor Bridge Disconnected</div>
          <div className="text-gray-400 mt-2 font-mono text-sm">
            USE_REAL_GESTURE=1 USE_REAL_HR=1 USE_REAL_ACCEL=1 python -m bridge.run
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
      <div className="grid grid-cols-3 gap-8 max-w-4xl w-full">
        
        {/* Heart Rate */}
        <div className="bg-gray-800 rounded-2xl p-8 text-center">
          <div 
            className={`text-8xl transition-transform duration-150 ${pulse ? 'scale-125' : 'scale-100'}`}
            style={{ color: hr?.connected ? '#ef4444' : '#6b7280' }}
          >
            ❤️
          </div>
          <div className="mt-4">
            {hr?.connected ? (
              <>
                <div className="text-5xl font-bold text-white">
                  {hr.data?.bpm ?? '--'}
                </div>
                <div className="text-gray-400 text-lg">BPM</div>
                {hr.data?.rr_intervals?.[0] && (
                  <div className="text-gray-500 text-sm mt-2">
                    RR: {hr.data.rr_intervals[0]}ms
                  </div>
                )}
              </>
            ) : (
              <div className="text-gray-500 text-xl">No Signal</div>
            )}
          </div>
          <div className={`mt-4 text-sm ${hr?.stale ? 'text-yellow-400' : 'text-green-400'}`}>
            {hr?.connected ? (hr?.stale ? '⚠️ Stale' : '● Live') : '○ Disconnected'}
          </div>
        </div>

        {/* Gesture */}
        <div className="bg-gray-800 rounded-2xl p-8 text-center">
          <div 
            className="text-8xl"
            style={{ 
              opacity: gesture?.data?.gesture === 'None' ? 0.3 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {GESTURE_EMOJI[gesture?.data?.gesture] ?? '🤚'}
          </div>
          <div className="mt-4">
            {gesture?.connected ? (
              <>
                <div className="text-3xl font-bold text-white">
                  {gesture.data?.gesture === 'None' ? 'No Gesture' : gesture.data?.gesture?.replace('_', ' ')}
                </div>
                {gesture.data?.confidence > 0 && (
                  <div className="text-gray-400 text-lg mt-1">
                    {Math.round(gesture.data.confidence * 100)}% confident
                  </div>
                )}
                <div className="text-gray-500 text-sm mt-2">
                  Hand: {gesture.data?.hand_detected ? '✓ Detected' : '✗ Not visible'}
                </div>
              </>
            ) : (
              <div className="text-gray-500 text-xl">No Camera</div>
            )}
          </div>
          <div className={`mt-4 text-sm ${gesture?.stale ? 'text-yellow-400' : 'text-green-400'}`}>
            {gesture?.connected ? (gesture?.stale ? '⚠️ Stale' : '● Live') : '○ Disconnected'}
          </div>
        </div>

        {/* Accelerometer / Tilt */}
        <div className="bg-gray-800 rounded-2xl p-8 text-center">
          <div className="relative w-32 h-32 mx-auto">
            {/* Tilt indicator */}
            <div 
              className="absolute inset-0 flex items-center justify-center text-8xl transition-transform duration-100"
              style={{ 
                transform: `rotateX(${-tilt.y}deg) rotateY(${tilt.x}deg)`,
                color: accel?.connected ? '#3b82f6' : '#6b7280'
              }}
            >
              ⬤
            </div>
            {/* Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full h-px bg-gray-600" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-full w-px bg-gray-600" />
            </div>
          </div>
          <div className="mt-4">
            {accel?.connected ? (
              <>
                <div className="text-2xl font-bold text-white">
                  Tilt: {tilt.x}° / {tilt.y}°
                </div>
                <div className="text-gray-500 text-sm mt-2 font-mono">
                  X:{accel.data?.x ?? 0} Y:{accel.data?.y ?? 0} Z:{accel.data?.z ?? 0}
                </div>
                <div className="text-gray-500 text-sm">
                  |G| = {accel.data?.magnitude ?? 0} mG
                </div>
              </>
            ) : (
              <div className="text-gray-500 text-xl">No Signal</div>
            )}
          </div>
          <div className={`mt-4 text-sm ${accel?.stale ? 'text-yellow-400' : 'text-green-400'}`}>
            {accel?.connected ? (accel?.stale ? '⚠️ Stale' : '● Live') : '○ Disconnected'}
          </div>
        </div>

      </div>
    </div>
  );
}
