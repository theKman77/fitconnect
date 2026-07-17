/**
 * Cross-platform confirm/alert. React Native's Alert buttons never fire on
 * react-native-web (the callbacks are dropped), so web uses window.confirm.
 */
import { Alert, Platform } from 'react-native';

interface ConfirmOpts {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function confirm(opts: ConfirmOpts, onConfirm: () => void): void {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (window.confirm(`${opts.title}\n\n${opts.message}`)) onConfirm();
    return;
  }
  Alert.alert(opts.title, opts.message, [
    { text: opts.cancelLabel ?? 'Cancel', style: 'cancel' },
    { text: opts.confirmLabel ?? 'Continue', style: opts.destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

export function notify(title: string, message: string): void {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
