import { useState, type FC } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
} from '@pikku/mantine/core'
import { usePikkuQuery, usePikkuMutation } from '@project/functions-sdk/pikku/api.gen'
import { m, asI18n } from '@/i18n/messages'
import { useLocale } from '@/i18n/config'

const money = (cents: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'GBP' }).format(
    cents / 100
  )

/**
 * Stock is shown as a state rather than a number until it is nearly gone.
 *
 * "12 left" on a shelf of 200 is noise; "2 left" is the only stock figure a
 * shopper acts on. Showing the count only when it is low means the number
 * carries information every time it appears.
 */
const stockBadge = (stock: number) => {
  if (stock === 0)
    return <Badge color="gray" variant="light">{m.catalogue__sold_out()}</Badge>
  if (stock <= 5)
    return (
      <Badge color="orange" variant="light">{m.catalogue__low_stock({ count: stock })}</Badge>
    )
  return <Badge color="teal" variant="light">{m.catalogue__in_stock()}</Badge>
}

export const CataloguePage: FC = () => {
  useLocale()
  const [search, setSearch] = useState('')

  const catalogue = usePikkuQuery('listItems', { search: search || undefined, limit: 24 })
  // The basket is fetched rather than assumed: it exists before sign-in, so the
  // id comes from the server rather than being derived from a session here.
  const basket = usePikkuQuery('getBasket', {})
  const addToBasket = usePikkuMutation('addToBasket')

  const [added, setAdded] = useState<string | null>(null)

  const add = useMutation({
    mutationFn: (itemId: string) =>
      addToBasket.mutateAsync({
        basketId: basket.data!.basketId,
        itemId,
        quantity: 1,
      }),
    onSuccess: (_result, itemId) => {
      setAdded(itemId)
      // Confirm in place rather than with a toast: the shopper's eyes are on
      // the card they just clicked, not the corner of the screen.
      setTimeout(() => setAdded((current) => (current === itemId ? null : current)), 1600)
    },
  })

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <Box>
          <Title order={1} fz={30} fw={650} style={{ letterSpacing: '-0.02em' }}>
            {m.catalogue__title()}
          </Title>
          <Text c="dimmed" size="sm">
            {m.catalogue__subtitle()}
          </Text>
        </Box>
        <TextInput
          placeholder={m.catalogue__search_placeholder()}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          w={{ base: '100%', sm: 280 }}
          aria-label="Search the catalogue"
        />
      </Group>

      {catalogue.isLoading ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} h={190} radius="md" />
          ))}
        </SimpleGrid>
      ) : catalogue.data?.items.length === 0 ? (
        <Card withBorder radius="md" p="xl">
          <Stack align="center" gap={4}>
            <Text fw={600}>{m.catalogue__empty_title()}</Text>
            <Text c="dimmed" size="sm">
              {m.catalogue__empty_hint()}
            </Text>
          </Stack>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {catalogue.data?.items.map((item) => (
            <Card key={item.itemId} withBorder radius="md" padding="lg">
              <Stack gap="xs" h="100%" justify="space-between">
                <Stack gap={6}>
                  <Group justify="space-between" wrap="nowrap" align="flex-start">
                    <Text fw={600} lh={1.25}>
                      {asI18n(item.name)}
                    </Text>
                    {stockBadge(item.stock)}
                  </Group>
                  <Text c="dimmed" size="xs" tt="uppercase" fw={600} lts="0.04em">
                    {asI18n(item.category.name)}
                  </Text>
                </Stack>

                <Group justify="space-between" align="center" mt="sm">
                  <Text fw={650} fz="lg">
                    {asI18n(money(item.priceCents))}
                  </Text>
                  <Button
                    size="xs"
                    variant={added === item.itemId ? 'light' : 'filled'}
                    color={added === item.itemId ? 'teal' : undefined}
                    disabled={item.stock === 0 || !basket.data}
                    loading={add.isPending && add.variables === item.itemId}
                    onClick={() => add.mutate(item.itemId)}
                  >
                    {added === item.itemId ? m.catalogue__added() : m.catalogue__add()}
                  </Button>
                </Group>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  )
}
