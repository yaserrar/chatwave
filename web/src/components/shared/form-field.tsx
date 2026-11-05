
import * as React from 'react';
import {
  Controller,
  type Control,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { Warning2 } from 'iconsax-react';
import { Field, FieldDescription, FieldError, FieldLabel } from '~/components/ui/field';
import { cn } from '~/lib/utils';

type ControlProps = {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby'?: string;
};

/**
 * One labelled form control wired to react-hook-form: label, control, description and error, with ids
 * and aria attributes passed to the control.
 *   <FormField control={form.control} name="name" label="Name">
 *     {(field, aria) => <Input {...field} {...aria} />}
 *   </FormField>
 */
export function FormField<T extends FieldValues, N extends FieldPath<T>>({
  control,
  name,
  label,
  description,
  optional,
  className,
  children,
}: {
  control: Control<T>;
  name: N;
  label: React.ReactNode;
  description?: React.ReactNode;
  /** Adds a quiet "Optional" after the label. */
  optional?: boolean;
  className?: string;
  children: (field: ControllerRenderProps<T, N>, aria: ControlProps, state: ControllerFieldState) => React.ReactNode;
}) {
  const id = React.useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const invalid = Boolean(fieldState.error);
        const describedBy = [description ? `${id}-description` : null, invalid ? `${id}-error` : null]
          .filter(Boolean)
          .join(' ');
        return (
          <Field data-invalid={invalid || undefined} className={cn('gap-2', className)}>
            <FieldLabel htmlFor={id} className="text-[13px] font-medium text-foreground">
              {label}
              {optional ? <span className="font-normal text-muted-foreground">Optional</span> : null}
            </FieldLabel>
            {children(field, { id, 'aria-invalid': invalid, 'aria-describedby': describedBy || undefined }, fieldState)}
            {description ? (
              <FieldDescription id={`${id}-description`} className="text-xs">
                {description}
              </FieldDescription>
            ) : null}
            <FieldError id={`${id}-error`} errors={[fieldState.error]} className="text-[13px]" />
          </Field>
        );
      }}
    />
  );
}

/** A form-level error (e.g. "Wrong email or password"), shown above the actions. */
export function FormAlert({ message, className }: { message: string | null | undefined; className?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={cn('flex items-start gap-2 rounded-lg bg-danger-subtle px-3 py-2.5 text-[13px] text-danger', className)}
    >
      <Warning2 aria-hidden className="mt-px size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
