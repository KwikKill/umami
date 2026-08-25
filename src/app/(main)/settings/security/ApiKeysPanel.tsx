import { Column, Row, Text } from '@umami/react-zen';
import { Badge } from '@/components/common/Badge';
import { DateDistance } from '@/components/common/DateDistance';
import { Panel } from '@/components/common/Panel';
import { useApiKeysQuery, useMessages } from '@/components/hooks';
import { Plus } from '@/components/icons';
import { DialogButton } from '@/components/input/DialogButton';
import { ApiKeyAddForm } from './ApiKeyAddForm';
import { ApiKeyDeleteButton } from './ApiKeyDeleteButton';
import { ApiKeyRotateButton } from './ApiKeyRotateButton';

export function ApiKeysPanel() {
  const { t, labels, messages } = useMessages();
  const { data: apiKeys, isLoading } = useApiKeysQuery();

  return (
    <Panel>
      <Column gap="4">
        <Row justifyContent="space-between" alignItems="center">
          <Text weight="bold">{t(labels.apiKeys)}</Text>
          <DialogButton icon={<Plus />} label={t(labels.createApiKey)} width="450px">
            {({ close }) => <ApiKeyAddForm onClose={close} />}
          </DialogButton>
        </Row>
        <Text color="muted">{t(messages.apiKeysDescription)}</Text>
        {!isLoading && !apiKeys?.length && <Text color="muted">{t(messages.noApiKeys)}</Text>}
        {apiKeys?.map(apiKey => (
          <Row key={apiKey.id} justifyContent="space-between" alignItems="center" gap>
            <Column gap="2">
              <Row gap="3" alignItems="center">
                <Text weight="bold">{apiKey.name}</Text>
                {apiKey.permissions.includes('read') && (
                  <Badge variant="gray" dot={false}>
                    {t(labels.apiKeyPermissionRead)}
                  </Badge>
                )}
                {apiKey.permissions.includes('write') && (
                  <Badge variant="gray" dot={false}>
                    {t(labels.apiKeyPermissionWrite)}
                  </Badge>
                )}
              </Row>
              <Row gap="2" alignItems="center">
                <Text size="sm" color="muted">
                  {apiKey.keyPrefix}...
                </Text>
                <Text size="sm" color="muted">
                  · {t(labels.created)}
                </Text>
                <DateDistance date={new Date(apiKey.createdAt)} />
                {apiKey.lastUsedAt && (
                  <>
                    <Text size="sm" color="muted">
                      · {t(labels.lastUsed)}
                    </Text>
                    <DateDistance date={new Date(apiKey.lastUsedAt)} />
                  </>
                )}
              </Row>
            </Column>
            <Row gap="2">
              <ApiKeyRotateButton apiKeyId={apiKey.id} name={apiKey.name} />
              <ApiKeyDeleteButton apiKeyId={apiKey.id} name={apiKey.name} />
            </Row>
          </Row>
        ))}
      </Column>
    </Panel>
  );
}
