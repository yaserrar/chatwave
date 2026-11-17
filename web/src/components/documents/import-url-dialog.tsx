import { zodResolver } from "@hookform/resolvers/zod";
import { Link21 } from "iconsax-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "~/components/shared/form-field";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { ALLOWED_LABEL, MAX_FILE_SIZE_MB } from "~/constants/uploads";
import { useImportDocument } from "~/hooks/documents";
import { applyServerErrors } from "~/lib/form-errors";
import { importUrlSchema, LINK_MAX_LENGTH } from "~/schemas/document";

/**
 * "Add from link": the API downloads the file behind a direct link, then it is processed like an upload.
 * Why a link was refused (a web page, a private address, too big, 404…) shows under the field.
 */
export function ImportUrlDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* Mounted only while open, so every opening starts with an empty field */}
        {open ? (
          <ImportUrlForm
            projectId={projectId}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ImportUrlForm({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  const importDocument = useImportDocument(projectId);
  const form = useForm({
    resolver: zodResolver(importUrlSchema),
    defaultValues: { url: "" },
  });

  const onSubmit = form.handleSubmit(async ({ url }) => {
    try {
      const doc = await importDocument.mutateAsync(url);
      toast.success(`Added “${doc.filename}”`, {
        description: "Processing starts in the background.",
      });
      onDone();
    } catch (error) {
      // 422 issues land on the field by themselves; any other reason (400, 409…) is shown there too
      const message = applyServerErrors(error, form.setError, ["url"] as const);
      if (message)
        form.setError(
          "url",
          { type: "server", message },
          { shouldFocus: true },
        );
    }
  });

  const pending = importDocument.isPending;

  return (
    <form onSubmit={onSubmit} noValidate className="contents">
      <DialogHeader className="flex-row items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-subtle text-brand-ink">
          <Link21 aria-hidden className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <DialogTitle>Add from a link</DialogTitle>
          <DialogDescription>
            Chatwave downloads the file, then reads it like an upload.
          </DialogDescription>
        </div>
      </DialogHeader>

      <FormField
        control={form.control}
        name="url"
        label="Link to the file"
        description={`A direct link to a ${ALLOWED_LABEL} file, up to ${MAX_FILE_SIZE_MB} MB. Web pages can't be added.`}
      >
        {(field, aria) => (
          <Input
            {...field}
            {...aria}
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            maxLength={LINK_MAX_LENGTH}
            placeholder="https://example.com/manual.pdf"
            disabled={pending}
            autoFocus
          />
        )}
      </FormField>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onDone}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Downloading…" : "Add document"}
        </Button>
      </DialogFooter>
    </form>
  );
}
