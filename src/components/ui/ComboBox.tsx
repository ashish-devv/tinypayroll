import { useState } from 'react';
import { View, Pressable, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './AppText';
import { usePalette } from './palette';

export interface ComboOption {
  id: string;
  name: string;
}

/**
 * Text input + dropdown of existing options with free-text entry.
 * `value` is the current text; picking an option calls onSelect with its id,
 * typing a new name calls onSelect with id=undefined (caller creates it on save).
 */
export function ComboBox({
  label,
  placeholder,
  value,
  options,
  onChange,
  onSelect,
}: {
  label: string;
  placeholder: string;
  value: string;
  options: ComboOption[];
  onChange: (text: string) => void;
  onSelect: (opt: ComboOption | null) => void;
}) {
  const P = usePalette();
  const [open, setOpen] = useState(false);

  const q = value.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options;
  const exactMatch = options.some((o) => o.name.toLowerCase() === q);
  const showAdd = q.length > 0 && !exactMatch;

  return (
    <View className="gap-1.5">
      <AppText className="font-inter-medium text-xs text-muted-light dark:text-muted-dark">{label}</AppText>

      <View className="flex-row items-center rounded-input border border-border-light bg-surface-low-light px-3.5 dark:border-border-dark dark:bg-surface-low-dark">
        <TextInput
          className="flex-1 py-3 font-inter text-sm text-text-light dark:text-text-dark"
          placeholderTextColor={P.placeholder}
          placeholder={placeholder}
          value={value}
          onFocus={() => setOpen(true)}
          onChangeText={(t) => {
            onChange(t);
            onSelect(null);
            setOpen(true);
          }}
        />
        <Pressable onPress={() => setOpen((v) => !v)} hitSlop={8}>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={P.muted} />
        </Pressable>
      </View>

      {open && (filtered.length > 0 || showAdd) && (
        <View className="overflow-hidden rounded-input border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
          <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {filtered.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => {
                  onChange(o.name);
                  onSelect(o);
                  setOpen(false);
                }}
                className="flex-row items-center gap-2 border-b border-border-light px-3.5 py-3 dark:border-border-dark"
              >
                <Ionicons
                  name={o.name.toLowerCase() === q ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={o.name.toLowerCase() === q ? P.primary : P.placeholder}
                />
                <AppText className="text-sm text-text-light dark:text-text-dark">{o.name}</AppText>
              </Pressable>
            ))}
            {showAdd && (
              <Pressable
                onPress={() => {
                  onSelect(null);
                  setOpen(false);
                }}
                className="flex-row items-center gap-2 px-3.5 py-3"
              >
                <Ionicons name="add-circle-outline" size={16} color={P.primary} />
                <AppText className="text-sm text-primary">Add “{value.trim()}”</AppText>
              </Pressable>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
