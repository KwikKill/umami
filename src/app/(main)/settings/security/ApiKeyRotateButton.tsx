import { useState } from 'react';
import { ConfirmationForm } from '@/components/common/ConfirmationForm';
import { useMessages, useUpdateQuery } from '@/components/hooks';
import { RefreshCw } from '@/components/icons';
import { DialogButton } from '@/components/input/DialogButton';
import { ApiKeyRevealPanel } from './ApiKeyRevealPanel';

export function ApiKeyRotateButton({ apiKeyId, name }: { apiKeyId: string; name: string }) {
  const { t, labels, messages } = useMessages();
  const [newKey, setNewKey] = useState<string | null>(null);
  const { mutateAsync, error, isPending, touch } = useUpdateQuery(
    `/me/api-keys/${apiKeyId}/rotate`,
  );

  const handleConfirm = async (close: () => void) => {
    const result = await mutateAsync({});

    touch('api-keys');
    close();
    setNewKey(result.key);
  };

  return (
    <>
      <DialogButton
        icon={<RefreshCw />}
        title={t(labels.rotateApiKey)}
        variant="quiet"
        width="500px"
      >
        {({ close }) => (
          <ConfirmationForm
            message={t.rich(messages.confirmRotateApiKey, {
              target: name,
              b: chunks => <b>{chunks}</b>,
            })}
            isLoading={isPending}
            error={error}
            onConfirm={handleConfirm.bind(null, close)}
            onClose={close}
            buttonLabel={t(labels.rotate)}
            buttonVariant="danger"
          />
        )}
      </DialogButton>
      <DialogButton
        isOpen={!!newKey}
        onOpenChange={isOpen => !isOpen && setNewKey(null)}
        title={t(labels.rotateApiKey)}
        width="500px"
      >
        {({ close }) => (
          <ApiKeyRevealPanel
            description={t(messages.apiKeyRotatedDescription)}
            apiKey={newKey ?? ''}
            onClose={() => {
              setNewKey(null);
              close();
            }}
          />
        )}
      </DialogButton>
    </>
  );
}
