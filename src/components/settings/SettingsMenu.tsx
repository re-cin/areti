import { ListRow } from '@/components/ui/ListRow';
import type { IconName } from '@/components/ui/Icon';
import { NeoBox } from '@/components/ui/NeoBox';

export type SettingsMenuItem = { key: string; label: string; icon: IconName; onPress?: () => void };

/** Bordered card of menu rows separated by ink lines. */
export function SettingsMenu({ items }: { items: SettingsMenuItem[] }) {
  return (
    <NeoBox style={{ overflow: 'hidden' }}>
      {items.map((item, i) => (
        <ListRow key={item.key} label={item.label} icon={item.icon} onPress={item.onPress} divider={i > 0} />
      ))}
    </NeoBox>
  );
}
