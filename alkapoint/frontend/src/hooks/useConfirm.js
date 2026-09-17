import { useState, useCallback } from 'react';

export default function useConfirm() {
  const [state, setState] = useState({
    open: false, title: '', message: '', confirmLabel: 'Confirm', danger: true, resolve: null,
  });

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title: opts.title || 'Are you sure?',
        message: opts.message || '',
        confirmLabel: opts.confirmLabel || 'Confirm',
        danger: opts.danger !== false,
        resolve,
      });
    });
  }, []);

  const close = (result) => {
    setState((s) => {
      s.resolve?.(result);
      return { ...s, open: false, resolve: null };
    });
  };

  const confirmProps = {
    open: state.open,
    title: state.title,
    message: state.message,
    confirmLabel: state.confirmLabel,
    danger: state.danger,
    onConfirm: () => close(true),
    onCancel: () => close(false),
  };

  return { confirm, confirmProps };
}