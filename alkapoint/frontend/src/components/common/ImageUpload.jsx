import { useRef, useState } from 'react';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';

/**
 * Local image picker → returns a base64 data URL.
 * Works entirely client-side; no file server required.
 * Keep images small (<500KB) — we downscale via canvas before storing.
 */
export default function ImageUpload({ value, onChange, label = 'Image', maxSize = 600 }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    setBusy(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Downscale to maxSize on the longest edge to keep base64 small
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        onChange(dataUrl);
        setBusy(false);
      };
      img.onerror = () => { alert('Could not read image'); setBusy(false); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label className="ap-label">{label}</label>
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="" className="w-32 h-32 object-cover rounded-xl border border-white/10" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-danger text-white flex items-center justify-center"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-32 h-32 rounded-xl border-2 border-dashed border-white/15 hover:border-brand-500/50 flex flex-col items-center justify-center text-paper-400 hover:text-brand-300 transition-colors"
        >
          <PhotoIcon className="w-8 h-8 mb-1" />
          <span className="text-[10px]">{busy ? 'Reading…' : 'Upload'}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}