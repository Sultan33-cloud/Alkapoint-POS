import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { money, dateTime } from '../utils/format';

export default function OrderDrawer({ open, onClose, sale }) {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-[70]">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60" />
        </Transition.Child>

        <div className="fixed inset-y-0 right-0 flex max-w-full">
          <Transition.Child
            as={Fragment}
            enter="transform transition ease-out duration-200"
            enterFrom="translate-x-full" enterTo="translate-x-0"
            leave="transform transition ease-in duration-150"
            leaveFrom="translate-x-0" leaveTo="translate-x-full"
          >
            <Dialog.Panel className="w-screen max-w-md bg-ink-800 border-l border-white/5 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className="text-lg font-bold text-paper-100">Sale Details</Dialog.Title>
                <button onClick={onClose} className="p-1 rounded hover:bg-white/5">
                  <XMarkIcon className="w-5 h-5 text-paper-400" />
                </button>
              </div>

              {sale && (
                <div className="space-y-4">
                  <div className="ap-card p-4">
                    <div className="text-xs text-paper-400">Invoice</div>
                    <div className="font-mono text-paper-100">{sale.invoiceNumber}</div>
                    <div className="text-xs text-paper-400 mt-2">Date</div>
                    <div className="text-paper-200">{dateTime(sale.saleDate)}</div>
                    <div className="text-xs text-paper-400 mt-2">Customer</div>
                    <div className="text-paper-200">{sale.customer?.name || 'Walk-in'}</div>
                  </div>

                  <div className="ap-card overflow-hidden">
                    <table className="ap-table">
                      <thead>
                        <tr><th>Item</th><th className="text-right">Qty</th><th className="text-right">Total</th></tr>
                      </thead>
                      <tbody>
                        {(sale.items || []).map((i) => (
                          <tr key={i.id}>
                            <td>{i.productName} — {i.variantName}</td>
                            <td className="text-right font-mono">{i.quantity}</td>
                            <td className="text-right font-mono">{money(i.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="ap-card p-4 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-paper-300">Subtotal</span><span className="font-mono">{money(sale.subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-paper-300">Discount</span><span className="font-mono">- {money(sale.discount)}</span></div>
                    <div className="flex justify-between pt-2 border-t border-white/5 font-bold"><span>TOTAL</span><span className="font-mono text-gold-400">{money(sale.total)}</span></div>
                    <div className="flex justify-between"><span className="text-paper-300">Paid</span><span className="font-mono text-success">{money(sale.amountPaid)}</span></div>
                    <div className="flex justify-between"><span className="text-paper-300">Balance</span><span className="font-mono text-danger">{money(sale.balance)}</span></div>
                  </div>
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}