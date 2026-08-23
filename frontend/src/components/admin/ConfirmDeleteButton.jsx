import { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";

export default function ConfirmDeleteButton({ label = "Delete", itemName, onConfirm }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
    } catch (err) {
      setError(err.message || "Failed to delete.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs font-medium text-red-600 hover:underline">
        {label}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Confirm delete"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirm} loading={loading}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-primary">
          Are you sure you want to delete {itemName ? <strong>{itemName}</strong> : "this item"}? This
          cannot be undone.
        </p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </Modal>
    </>
  );
}
