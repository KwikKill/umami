import {
  Alert,
  AlertTitle,
  Button,
  Column,
  Form,
  FormButtons,
  FormField,
  FormSubmitButton,
  Heading,
  Icon,
  PasswordField,
  Separator,
  TextField,
} from '@umami/react-zen';
import { useRouter, useSearchParams } from 'next/navigation';
import { useConfig, useMessages, useUpdateQuery } from '@/components/hooks';
import { Logo } from '@/components/svg';
import { getApiUrl } from '@/lib/api-url';
import { setClientAuthToken } from '@/lib/client';
import { setUser } from '@/store/app';

export function LoginForm() {
  const { t, labels, messages, getErrorMessage } = useMessages();
  const router = useRouter();
  const config = useConfig();
  const searchParams = useSearchParams();
  const ssoError = searchParams.get('ssoError');
  const { mutateAsync, error } = useUpdateQuery('/auth/login');

  const handleSubmit = async (data: any) => {
    await mutateAsync(data, {
      onSuccess: async (response: any) => {
        if (response.requiresTwoFactor) {
          sessionStorage.setItem('umami.partial-token', response.partialToken);
          router.push('/login/two-factor');
          return;
        }
        setClientAuthToken(response.token);
        setUser(response.user);
        router.push('/');
      },
    });
  };

  const handleSsoLogin = () => {
    window.location.href = getApiUrl('/auth/oidc/login');
  };

  return (
    <Column justifyContent="center" alignItems="center" gap="6">
      <Icon size="lg">
        <Logo />
      </Icon>
      <Heading>umami</Heading>
      {ssoError && (
        <Alert variant="danger" style={{ minWidth: 300 }}>
          <AlertTitle>{t(messages.ssoLoginError, { code: ssoError })}</AlertTitle>
        </Alert>
      )}
      <Form onSubmit={handleSubmit} error={getErrorMessage(error)} style={{ minWidth: 300 }}>
        <FormField
          label={t(labels.username)}
          data-test="input-username"
          name="username"
          rules={{ required: t(labels.required) }}
        >
          <TextField autoComplete="username" />
        </FormField>

        <FormField
          label={t(labels.password)}
          data-test="input-password"
          name="password"
          rules={{ required: t(labels.required) }}
        >
          <PasswordField autoComplete="current-password" />
        </FormField>
        <FormButtons>
          <FormSubmitButton
            data-test="button-submit"
            variant="primary"
            style={{ flex: 1 }}
            isDisabled={false}
          >
            {t(labels.login)}
          </FormSubmitButton>
        </FormButtons>
      </Form>
      {config?.ssoEnabled && (
        <Column gap="4" style={{ minWidth: 300 }}>
          <Separator orientation="horizontal" />
          <Button onPress={handleSsoLogin} style={{ width: '100%' }}>
            {t(messages.ssoLoginButton, { provider: config.ssoButtonLabel })}
          </Button>
        </Column>
      )}
    </Column>
  );
}
