import { ConfirmationForm } from '@/components/common/ConfirmationForm';
import { useDeleteQuery, useMessages } from '@/components/hooks';
import { Trash } from '@/components/icons';
import { DialogButton } from '@/components/input/DialogButton';

export function ApiKeyDeleteButton({ apiKeyId, name }: { apiKeyId: string; name: string }) {
  const { t, labels, messages } = useMessages();
  const { mutateAsync, isPending, error, touch } = useDeleteQuery(`/me/api-keys/${apiKeyId}`);

  const handleConfirm = async (close: () => void) => {
    await mutateAsync(null, {
      onSuccess: () => {
        touch('api-keys');
        close();
      },
    });
  };

  return (
    <DialogButton icon={<Trash />} title={t(labels.confirm)} variant="quiet" width="600px">
      {({ close }) => (
        <ConfirmationForm
          message={t.rich(messages.confirmRemove, {
            target: name,
            b: chunks => <b>{chunks}</b>,
          })}
          isLoading={isPending}
          error={error}
          onConfirm={handleConfirm.bind(null, close)}
          onClose={close}
          buttonLabel={t(labels.delete)}
          buttonVariant="danger"
        />
      )}
    </DialogButton>
  );
}
