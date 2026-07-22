import { useEffect } from 'react';
import { subscribe } from '../store';

export function useRealtimeSync(event, callback) {
  useEffect(() => {
    return subscribe(event, callback);
  }, [event, callback]);
}
