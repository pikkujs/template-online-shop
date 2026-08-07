import type { FC } from 'react'
import { Box, Stack, Text, Title } from '@pikku/mantine/core'
import { m } from '@/i18n/messages'
import { useLocale } from '@/i18n/config'

export const HomePage: FC = () => {
  useLocale()
  const appName = m.app__name()

  return (
    <Box mih="70vh" style={{ display: 'grid', placeItems: 'center' }}>
      <Stack maw={520} ta="center" gap="md">
        <Title order={1} fz={34} fw={650} style={{ letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          {m.home__title()}
        </Title>
        <Text c="dimmed" size="md" style={{ lineHeight: 1.6 }}>
          {m.home__body({ name: appName })}
        </Text>
      </Stack>
    </Box>
  )
}
