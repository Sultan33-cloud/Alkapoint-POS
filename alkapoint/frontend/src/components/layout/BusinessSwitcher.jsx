import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { useBusiness } from '../../context/BusinessContext';

export default function BusinessSwitcher() {
  const { business, businesses, switchBusiness } = useBusiness();
  if (!business) return null;

  return (
    <Menu as="div" className="relative hidden md:block">
      <Menu.Button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ink-700 hover:bg-ink-600 text-sm">
        <BuildingStorefrontIcon className="w-4 h-4 text-brand-300" />
        <span className="font-medium text-paper-100 max-w-[140px] truncate">{business.name}</span>
        <ChevronDownIcon className="w-3.5 h-3.5 text-paper-400" />
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
        leave="transition ease-in duration-75" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
      >
        <Menu.Items className="absolute left-0 mt-2 w-64 origin-top-left ap-card p-1 z-40">
          <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-paper-400 font-bold">Switch business</div>
          {businesses.map((b) => (
            <Menu.Item key={b.id}>
              {({ active }) => (
                <button
                  onClick={() => switchBusiness(b)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${active ? 'bg-white/5' : ''} ${b.id === business.id ? 'text-brand-200' : 'text-paper-200'}`}
                >
                  {b.name}
                </button>
              )}
            </Menu.Item>
          ))}
          <div className="border-t border-white/5 mt-1 px-3 py-2 text-[11px] text-paper-400">
            Additional businesses appear here once configured.
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}