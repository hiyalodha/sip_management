// A styled replacement for window.confirm(), driven by a small state object:
// { open, title, message, confirmLabel, danger, onConfirm }
export default function ConfirmDialog({ state, onClose }) {
  if (!state?.open) return null;

  function handleConfirm() {
    state.onConfirm?.();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-card-lg border border-ink-200 p-6 animate-toast-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-ink-900">{state.title}</h3>
        <p className="text-sm text-ink-500 mt-2">{state.message}</p>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-ink-600 border border-ink-200 hover:bg-ink-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-card transition-colors ${
              state.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {state.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
