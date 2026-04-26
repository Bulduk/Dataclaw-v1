import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface Signal {
  id: string;
  source: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  confidence: number;
  timestamp: string;
}

export function useRealtimeSignals() {
  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    // Initial fetch
    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);
      
      if (!error && data) {
        setSignals(data as Signal[]);
      }
    };
    
    fetchInitial();

    // Subscribe to new signals
    const channel = supabase
      .channel('public:signals')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'signals' },
        (payload) => {
          setSignals((current) => [payload.new as Signal, ...current].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return signals;
}
