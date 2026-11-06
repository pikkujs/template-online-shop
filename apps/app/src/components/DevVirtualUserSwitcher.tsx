import type { FC } from 'react'
import { Button, Menu, Text } from '@pikku/mantine/core'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { devVirtualUsers, signInAsVirtualUser } from '@/lib/auth'
import { asI18n, m } from '@/i18n/messages'

// Dev-only floating "Sign in as" switcher: one click signs in as any declared
// scenario virtual user (no password), so you can view the app as each user kind.
// Renders nothing in production or when the server offers none.
export const DevVirtualUserSwitcher: FC = () => {
  const navigate = useNavigate()
  const { data: virtualUsers = [] } = useQuery({
    queryKey: ['dev-virtual-users'],
    queryFn: devVirtualUsers,
  })
  const signIn = useMutation({
    mutationFn: (id: string) => signInAsVirtualUser(id),
    onSuccess: () => navigate({ to: '/app' }),
  })
  if (virtualUsers.length === 0) return null
  return (
    <Menu position="top-end" withArrow>
      <Menu.Target>
        <Button
          size="xs"
          variant="light"
          style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}
        >
          {m.dev_virtual_users__cta()}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{m.dev_virtual_users__label()}</Menu.Label>
        {virtualUsers.map((virtualUser) => {
          const busy = signIn.isPending && signIn.variables === virtualUser.id
          return (
            <Menu.Item
              key={virtualUser.id}
              disabled={signIn.isPending}
              onClick={() => signIn.mutate(virtualUser.id)}
            >
              <Text size="sm" fw={500}>
                {asI18n(busy ? `${virtualUser.name} …` : virtualUser.name)}
              </Text>
              {virtualUser.jobTitle ? (
                <Text size="xs" c="dimmed">
                  {asI18n(virtualUser.jobTitle)}
                </Text>
              ) : null}
            </Menu.Item>
          )
        })}
        {signIn.isError ? (
          <Text size="xs" c="red" px="sm" pt={4}>
            {m.dev_virtual_users__error()}
          </Text>
        ) : null}
      </Menu.Dropdown>
    </Menu>
  )
}
