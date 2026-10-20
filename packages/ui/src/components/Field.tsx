'use client';

import { Checkbox as CheckboxPrimitive, RadioGroup as RadioPrimitive, Switch as SwitchPrimitive } from 'radix-ui';
import { Check } from 'lucide-react';
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

import { cx } from './cx.ts';
import { Icon } from './Icon.tsx';

const CONTROL =
  'w-full h-control-m rounded-control border border-line-300 bg-surface-0 px-3 text-body-s text-ink-900 ' +
  'placeholder:text-ink-500 transition-colors duration-fast ease-kardia hover:border-ink-500 ' +
  'aria-invalid:border-critical-600 disabled:bg-surface-100 disabled:text-ink-500';

interface FieldShellProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode | undefined;
  error?: ReactNode | undefined;
  required?: boolean | undefined;
  /** Text für "Pflicht", übersetzt von der App. */
  requiredLabel?: string | undefined;
  children: ReactNode;
  className?: string | undefined;
}

/** Label immer sichtbar über dem Feld (PRD 8.5); Hinweis und Fehler darunter. */
export function FieldShell({ id, label, hint, error, required, requiredLabel = 'Pflicht', children, className }: FieldShellProps) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-caption text-ink-700">
        {label}
        {required ? <span className="ml-1 text-ink-500">· {requiredLabel}</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-micro text-critical-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-micro text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Einheit als Suffix ("CHF", "%", "Wo"). */
  unit?: string;
  /** Einheit vor dem Wert (z. B. "CHF" bei Beträgen). */
  prefix?: string;
  requiredLabel?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, unit, prefix, id, className, required, requiredLabel, ...props },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <FieldShell
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      requiredLabel={requiredLabel}
      className={className}
    >
      <div className="relative flex items-center">
        {prefix ? (
          <span className="pointer-events-none absolute left-3 text-body-s text-ink-500">{prefix}</span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cx(CONTROL, prefix && 'pl-12', unit && 'pr-12', props.type === 'number' && 'tabular')}
          {...props}
        />
        {unit ? (
          <span className="pointer-events-none absolute right-3 text-body-s text-ink-500">{unit}</span>
        ) : null}
      </div>
    </FieldShell>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  requiredLabel?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, id, className, required, requiredLabel, ...props },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <FieldShell
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      requiredLabel={requiredLabel}
      className={className}
    >
      <textarea
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cx(CONTROL, 'h-auto min-h-24 py-2 leading-5')}
        {...props}
      />
    </FieldShell>
  );
});

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  options: { value: string; label: string }[];
  placeholder?: string;
  requiredLabel?: string;
}

/** Natives Select: zugänglich, mobil vertraut, ohne Client-JS. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, options, placeholder, id, className, required, requiredLabel, ...props },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <FieldShell
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      requiredLabel={requiredLabel}
      className={className}
    >
      <select
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cx(CONTROL, 'appearance-auto pr-8')}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
});

export function Checkbox({
  label,
  description,
  checked,
  onCheckedChange,
  name,
  value,
  disabled,
  id,
}: {
  label: ReactNode;
  description?: ReactNode;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  name?: string;
  value?: string;
  disabled?: boolean;
  id?: string;
}) {
  const auto = useId();
  const cid = id ?? auto;
  return (
    <div className="flex items-start gap-3 py-1 pointer-coarse:min-h-touch">
      <CheckboxPrimitive.Root
        id={cid}
        {...(checked !== undefined ? { checked } : {})}
        {...(onCheckedChange ? { onCheckedChange: (v) => onCheckedChange(v === true) } : {})}
        {...(name ? { name } : {})}
        {...(value ? { value } : {})}
        {...(disabled ? { disabled } : {})}
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-line-300 bg-surface-0 data-[state=checked]:border-accent-600 data-[state=checked]:bg-accent-600 data-[state=checked]:text-on-accent"
      >
        <CheckboxPrimitive.Indicator>
          <Icon icon={Check} size={16} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <label htmlFor={cid} className="flex flex-col text-body-s text-ink-900">
        {label}
        {description ? <span className="text-micro text-ink-500">{description}</span> : null}
      </label>
    </div>
  );
}

export function Switch({
  label,
  checked,
  onCheckedChange,
  name,
  id,
  disabled,
}: {
  label: ReactNode;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
}) {
  const auto = useId();
  const sid = id ?? auto;
  return (
    <div className="flex items-center gap-3 pointer-coarse:min-h-touch">
      <SwitchPrimitive.Root
        id={sid}
        {...(checked !== undefined ? { checked } : {})}
        {...(onCheckedChange ? { onCheckedChange } : {})}
        {...(name ? { name } : {})}
        {...(disabled ? { disabled } : {})}
        className="relative h-6 w-10 shrink-0 rounded-chip border border-line-300 bg-surface-100 transition-colors duration-fast ease-kardia data-[state=checked]:border-accent-600 data-[state=checked]:bg-accent-600"
      >
        <SwitchPrimitive.Thumb className="block size-4 translate-x-1 rounded-chip bg-surface-0 transition-transform duration-fast ease-kardia data-[state=checked]:translate-x-5" />
      </SwitchPrimitive.Root>
      <label htmlFor={sid} className="text-body-s text-ink-900">
        {label}
      </label>
    </div>
  );
}

export function RadioGroup({
  label,
  options,
  value,
  onValueChange,
  name,
  orientation = 'vertical',
}: {
  label: ReactNode;
  options: { value: string; label: ReactNode; description?: ReactNode }[];
  value?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  orientation?: 'vertical' | 'horizontal';
}) {
  const auto = useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-caption text-ink-700">{label}</legend>
      <RadioPrimitive.Root
        {...(value !== undefined ? { value } : {})}
        {...(onValueChange ? { onValueChange } : {})}
        {...(name ? { name } : {})}
        orientation={orientation}
        className={cx('flex gap-2', orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap')}
      >
        {options.map((o) => {
          const rid = `${auto}-${o.value}`;
          return (
            <div key={o.value} className="flex items-start gap-3 pointer-coarse:min-h-touch">
              <RadioPrimitive.Item
                id={rid}
                value={o.value}
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-chip border border-line-300 bg-surface-0 data-[state=checked]:border-accent-600"
              >
                <RadioPrimitive.Indicator className="block size-2.5 rounded-chip bg-accent-600" />
              </RadioPrimitive.Item>
              <label htmlFor={rid} className="flex flex-col text-body-s text-ink-900">
                {o.label}
                {o.description ? <span className="text-micro text-ink-500">{o.description}</span> : null}
              </label>
            </div>
          );
        })}
      </RadioPrimitive.Root>
    </fieldset>
  );
}
