export default function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`w-full ${widths[size]} ap-card animate-fade-in max-h-[90vh] flex flex-col`}>
        <div className="ap-card-header shrink-0">
          <div className="ap-card-title">{title}</div>
          <button onClick={onClose} className="text-paper-400 hover:text-paper-100 text-xl leading-none">×</button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}