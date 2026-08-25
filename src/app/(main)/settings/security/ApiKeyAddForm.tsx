import {
  Button,
  Checkbox,
  Column,
  Form,
  FormButtons,
  FormField,
  FormSubmitButton,
  Text,
  TextField,
} from '@umami/react-zen';
import { useState } from 'react';
import { useMessages, useUpdateQuery } from '@/components/hooks';
import { ApiKeyRevealPanel } from './ApiKeyRevealPanel';

export function ApiKeyAddForm({ onSave, onClose }: { onSave?: () => void; onClose?: () => void }) {
  const { t, labels, messages, getErrorMessage } = useMessages();
  const [permissions, setPermissions] = useState<string[]>(['read']);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const { mutateAsync, error, isPending, touch } = useUpdateQuery('/me/api-keys');

  const togglePermission = (permission: string) => (isSelected: boolean) => {
    setPermissions(prev =>
      isSelected ? [...prev, permission] : prev.filter(item => item !== permission),
    );
  };

  const handleSubmit = async (formData: any) => {
    const result = await mutateAsync({ ...formData, permissions });

    touch('api-keys');
    onSave?.();
    setCreatedKey(result.key);
  };

  if (createdKey) {
    return (
      <ApiKeyRevealPanel
        description={t(messages.apiKeyCreatedDescription)}
        apiKey={createdKey}
        onClose={onClose}
      />
    );
  }

  return (
    <Form onSubmit={handleSubmit} error={getErrorMessage(error)}>
      <FormField name="name" label={t(labels.name)} rules={{ required: t(labels.required) }}>
        <TextField autoFocus />
      </FormField>
      <Column gap="3">
        <Text weight="bold">{t(labels.permissions)}</Text>
        <Checkbox isSelected={permissions.includes('read')} onChange={togglePermission('read')}>
          {t(labels.apiKeyPermissionRead)}
        </Checkbox>
        <Checkbox isSelected={permissions.includes('write')} onChange={togglePermission('write')}>
          {t(labels.apiKeyPermissionWrite)}
        </Checkbox>
      </Column>
      <FormButtons>
        <Button isDisabled={isPending} onPress={onClose}>
          {t(labels.cancel)}
        </Button>
        <FormSubmitButton
          variant="primary"
          isDisabled={isPending || permissions.length === 0}
          data-test="button-submit"
        >
          {t(labels.create)}
        </FormSubmitButton>
      </FormButtons>
    </Form>
  );
}
