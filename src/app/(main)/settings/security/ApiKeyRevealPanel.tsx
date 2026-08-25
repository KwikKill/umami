import { Button, Column, FormButtons, Text, TextField } from '@umami/react-zen';
import { useMessages } from '@/components/hooks';

export function ApiKeyRevealPanel({
  description,
  apiKey,
  onClose,
}: {
  description: string;
  apiKey: string;
  onClose?: () => void;
}) {
  const { t, labels } = useMessages();

  return (
    <Column gap="4">
      <Text>{description}</Text>
      <TextField value={apiKey} isReadOnly allowCopy />
      <FormButtons>
        <Button variant="primary" onPress={onClose}>
          {t(labels.close)}
        </Button>
      </FormButtons>
    </Column>
  );
}
