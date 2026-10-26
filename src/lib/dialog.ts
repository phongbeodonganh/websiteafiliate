// Imperative, promise-based replacement for window.alert / confirm / prompt.
// <DialogHost /> (mounted once in the admin shell) subscribes to this store and renders
// the styled modal, so call sites stay one-liners: `await dialog.confirm('Delete?')`.

export type DialogVariant = 'success' | 'error' | 'info' | 'danger';

export type DialogRequest =
  | { id: number; kind: 'alert'; message: string; title?: string; variant: DialogVariant; resolve: () => void }
  | {
      id: number;
      kind: 'confirm';
      message: string;
      title?: string;
      variant: DialogVariant;
      confirmLabel?: string;
      resolve: (ok: boolean) => void;
    }
  | {
      id: number;
      kind: 'prompt';
      message: string;
      title?: string;
      variant: DialogVariant;
      defaultValue: string;
      placeholder?: string;
      confirmLabel?: string;
      resolve: (value: string | null) => void;
    };

type Listener = (queue: DialogRequest[]) => void;

let queue: DialogRequest[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l(queue));
}

function push<T extends DialogRequest>(request: T) {
  queue = [...queue, request];
  emit();
}

export function subscribeDialogs(listener: Listener) {
  listeners.add(listener);
  listener(queue);
  return () => {
    listeners.delete(listener);
  };
}

export function closeDialog(id: number) {
  queue = queue.filter((d) => d.id !== id);
  emit();
}

// Existing call sites pass plain sentences; infer the tone from the wording.
function inferVariant(message: string): DialogVariant {
  return /^(error|unable|failed|there are no|no )|\bunable to\b|\bfailed\b/i.test(message.trim()) ? 'error' : 'success';
}

export const dialog = {
  alert(message: string, options: { title?: string; variant?: DialogVariant } = {}): Promise<void> {
    return new Promise((resolve) =>
      push({ id: nextId++, kind: 'alert', message, title: options.title, variant: options.variant ?? inferVariant(message), resolve })
    );
  },
  confirm(
    message: string,
    options: { title?: string; confirmLabel?: string; variant?: DialogVariant } = {}
  ): Promise<boolean> {
    return new Promise((resolve) =>
      push({
        id: nextId++,
        kind: 'confirm',
        message,
        title: options.title,
        variant: options.variant ?? 'danger',
        confirmLabel: options.confirmLabel,
        resolve,
      })
    );
  },
  prompt(
    message: string,
    options: { title?: string; defaultValue?: string; placeholder?: string; confirmLabel?: string } = {}
  ): Promise<string | null> {
    return new Promise((resolve) =>
      push({
        id: nextId++,
        kind: 'prompt',
        message,
        title: options.title,
        variant: 'info',
        defaultValue: options.defaultValue ?? '',
        placeholder: options.placeholder,
        confirmLabel: options.confirmLabel,
        resolve,
      })
    );
  },
};
