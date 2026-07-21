import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

// useIsOnline — reactive connectivity flag. Starts optimistic (true) so we never flash the
// offline badge before NetInfo reports; then tracks reachability for the lifetime of the mount.
// A device is "online" only when it has a network link AND internet is actually reachable
// (isInternetReachable can be null while probing — treat null as "still online").
export function useIsOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    };

    NetInfo.fetch().then(update);
    const unsubscribe = NetInfo.addEventListener(update);
    return unsubscribe;
  }, []);

  return online;
}
