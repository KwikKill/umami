import {
  Box,
  Button,
  Calendar,
  Form,
  FormButtons,
  FormField,
  FormSubmitButton,
  Label,
  Row,
  TextField,
} from '@umami/react-zen';
import { useState } from 'react';
import type { WebsiteAnnotation } from '@/components/hooks';
import { useDeleteQuery, useMessages, useUpdateQuery } from '@/components/hooks';

export function AnnotationEditForm({
  websiteId,
  annotation,
  onSave,
  onClose,
}: {
  websiteId: string;
  annotation?: WebsiteAnnotation;
  onSave?: () => void;
  onClose?: () => void;
}) {
  const { t, labels, getErrorMessage } = useMessages();
  const [date, setDate] = useState(annotation ? new Date(annotation.date) : new Date());

  const { mutateAsync, error, isPending, touch } = useUpdateQuery(
    `/websites/${websiteId}/annotations${annotation ? `/${annotation.id}` : ''}`,
  );
  const { mutateAsync: deleteAnnotation, isPending: isDeleting } = useDeleteQuery(
    `/websites/${websiteId}/annotations/${annotation?.id}`,
  );

  const handleSubmit = async (formData: any) => {
    await mutateAsync(
      { ...formData, date },
      {
        onSuccess: async () => {
          touch('annotations');
          onSave?.();
          onClose?.();
        },
      },
    );
  };

  const handleDelete = async () => {
    await deleteAnnotation(null, {
      onSuccess: () => {
        touch('annotations');
        onSave?.();
        onClose?.();
      },
    });
  };

  return (
    <Form onSubmit={handleSubmit} defaultValues={annotation} error={getErrorMessage(error)}>
      <Label>{t(labels.date)}</Label>
      <Calendar value={date} onChange={setDate} />
      <FormField name="text" label={t(labels.description)} rules={{ required: t(labels.required) }}>
        <TextField autoFocus asTextArea />
      </FormField>
      <FormButtons>
        <Row justifyContent="space-between" width="100%">
          {annotation ? (
            <Button
              variant="danger"
              isDisabled={isPending || isDeleting}
              onPress={handleDelete}
            >
              {t(labels.delete)}
            </Button>
          ) : (
            <Box />
          )}
          <Row gap>
            <Button isDisabled={isPending || isDeleting} onPress={onClose}>
              {t(labels.cancel)}
            </Button>
            <FormSubmitButton variant="primary" isDisabled={isPending || isDeleting}>
              {t(labels.save)}
            </FormSubmitButton>
          </Row>
        </Row>
      </FormButtons>
    </Form>
  );
}
