'use client';

import { useRouter } from 'next/navigation';

export function JobPicker({
  label,
  current,
  jobs,
}: {
  label: string;
  current: string;
  jobs: { id: string; label: string }[];
}) {
  const router = useRouter();
  return (
    <label className="flex w-full min-w-0 flex-col gap-1.5 text-caption text-ink-700 sm:w-auto">
      {label}
      <select
        value={current}
        onChange={(e) => router.push(`/employer/pipeline?job=${e.target.value}`)}
        className="h-control-m w-full min-w-0 rounded-control sm:w-auto sm:min-w-72 border border-line-300 bg-surface-0 px-3 text-body-s text-ink-900"
      >
        {jobs.map((j) => (
          <option key={j.id} value={j.id}>
            {j.label}
          </option>
        ))}
      </select>
    </label>
  );
}
