import { Metadata } from "next";
import Content from "@/app/dashboard/Content";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Scio.ly | Dashboard",
  description: "Track your Scioly test-taking performance across several statistics"
}
export default function Page() {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-gray-50 dark:bg-gray-900" />
        <div className="relative z-10 pt-20 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 md:mb-8">
              <div className="lg:col-span-2 rounded-lg p-6 border dark:border-gray-700 border-gray-200 bg-white dark:bg-gray-800 animate-pulse h-[136px]">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-8 w-64 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-4 w-80 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <div className="hidden md:block p-6 rounded-lg bg-gray-100 dark:bg-gray-700" />
                </div>
              </div>
              <div className="flex">
                <div className="rounded-lg w-full py-7 px-6 bg-blue-600/60 animate-pulse h-[136px]" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:mb-8">
              <div className="md:col-span-1">
                <div className="perspective-1000 text-center">
                  <div className="p-0 h-32 rounded-lg relative border dark:border-gray-700 border-gray-200 bg-white dark:bg-gray-800 animate-pulse">
                    <div className="absolute w-full h-full flex flex-col px-6 pt-6 pb-3">
                      <div className="h-5 w-40 mb-2 rounded bg-gray-200 dark:bg-gray-700" />
                      <div className="h-9 w-24 rounded bg-gray-200 dark:bg-gray-700 self-center" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:col-span-3 hidden md:flex md:col-span-2 rounded-lg border dark:border-gray-700 border-gray-200 bg-white dark:bg-gray-800 pl-5 pr-5 h-32 overflow-hidden animate-pulse">
                <div className="flex flex-row w-full items-center gap-4 h-full">
                  <div className="flex-none min-w-[110px]">
                    <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
                    <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <div className="flex-1 h-full">
                    <div className="grid grid-cols-4 gap-4 h-full items-center">
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <div key={idx} className="hidden md:flex items-center justify-center rounded-md h-[80%] bg-gray-50/60 dark:bg-gray-900/30 border dark:border-gray-800 border-gray-200" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="p-6 rounded-lg border dark:border-gray-700 border-gray-200 bg-white dark:bg-gray-800 flex flex-col h-[360px] md:h-[300px] animate-pulse">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-16 rounded-md bg-gray-200 dark:bg-gray-700" />
                    <div className="h-8 w-20 rounded-md bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-6 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
                  ))}
                </div>
                <div className="w-full flex-1 min-h-0 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="p-6 rounded-lg border dark:border-gray-700 border-gray-200 bg-white dark:bg-gray-800 flex flex-col h-[360px] md:h-[300px] animate-pulse">
                <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-700 mb-4" />
                <div className="flex-1 w-full rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-pulse">
              <div className="rounded-lg border dark:border-gray-700 border-gray-200 bg-white dark:bg-gray-800">
                <div className="w-full h-full p-6 flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-gray-200 dark:bg-gray-700 w-12 h-12" />
                  <div className="flex-1 space-y-2">
                    <div className="h-6 w-56 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-4 w-64 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 md:flex md:space-x-2 md:grid-cols-none">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
                    ))}
                  </div>
                </div>
              </div>
              <div className="rounded-lg border dark:border-gray-700 border-gray-200 bg-white dark:bg-gray-800">
                <div className="w-full h-full p-6 flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-gray-200 dark:bg-gray-700 w-12 h-12" />
                  <div className="flex-1 space-y-2">
                    <div className="h-6 w-56 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-4 w-64 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    }>
      <Content />
    </Suspense>
  );
}