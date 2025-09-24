import React from 'react';
import TestConfiguration from '@/app/practice/components/TestConfiguration';

export default function AssignModal({
  darkMode,
  open,
  scope,
  eventName,
  settings,
  onSettingsChange,
  onGenerate,
  onClose,
}: {
  darkMode: boolean;
  open: boolean;
  scope: string;
  eventName: string;
  settings: any;
  onSettingsChange: (s: any) => void;
  onGenerate: () => void | Promise<void>;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} w-full lg:w-[26rem] rounded-xl shadow-xl p-5`} onClick={(e)=>e.stopPropagation()}>
        <div className="relative mb-4">
          <div className="text-lg font-semibold text-center">Assign {scope === 'all' ? 'to All' : `to ${scope}`}: {eventName}</div>
          <button onClick={onClose} className={`absolute top-0 right-0 ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>×</button>
        </div>
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md">
            <TestConfiguration
              selectedEvent={{ id: 0, name: eventName, subject: '', divisions: ['B','C'] } as any}
              settings={settings}
              onSettingsChange={onSettingsChange}
              forceBothDivision
              onGenerateTest={onGenerate}
              onUnlimited={()=>{}}
              generateLabel="Preview Test"
              hideUnlimited
            />
          </div>
        </div>
      </div>
    </div>
  );
}


