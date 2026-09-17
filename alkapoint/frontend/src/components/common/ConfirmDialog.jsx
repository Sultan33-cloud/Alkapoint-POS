import Modal from './Modal';

export default function ConfirmDialog({
  open, title = 'Are you sure?', message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  danger = true, onConfirm, onCancel,
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <div className="text-sm text-paper-200 mb-5">{message}</div>
      <div className="flex justify-end gap-2">
        <button className="ap-btn-secondary" onClick={onCancel}>{cancelLabel}</button>
        <button className={danger ? 'ap-btn-danger' : 'ap-btn-primary'} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}