import { ScrollView, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { Screen, AppText, Card, Divider, usePalette, pressScale, Skeleton } from '@/src/components/ui';
import { listActivityPage, relativeTime, type ActivityEntry } from '@/src/services/activity';

const PAGE_SIZE = 12;

// One activity row — mirrors the dashboard preview's styling.
function ActivityRow({ item, showDivider }: { item: ActivityEntry; showDivider: boolean }) {
  const P = usePalette();
  return (
    <View>
      <View className="flex-row items-center gap-3 px-4 py-3.5">
        <View className="h-[38px] w-[38px] items-center justify-center rounded-full bg-surface-low-light dark:bg-surface-low-dark">
          <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={18} color={P.primary} />
        </View>
        <View className="flex-1 gap-0.5">
          <AppText className="font-inter-medium text-sm">{item.label}</AppText>
          <AppText className="text-xs text-placeholder-light dark:text-placeholder-dark">
            {relativeTime(item.createdAt)}
          </AppText>
        </View>
      </View>
      {showDivider && <Divider />}
    </View>
  );
}

// Skeleton placeholder row shown while a page is loading.
function SkeletonRow({ showDivider }: { showDivider: boolean }) {
  return (
    <View>
      <View className="flex-row items-center gap-3 px-4 py-3.5">
        <Skeleton width={38} height={38} radius={19} />
        <View className="flex-1 gap-1.5">
          <Skeleton width="65%" height={13} radius={6} />
          <Skeleton width="35%" height={11} radius={6} />
        </View>
      </View>
      {showDivider && <Divider />}
    </View>
  );
}

export default function AllActivityScreen() {
  const P = usePalette();

  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load (and reload on focus so newly-created activity shows up).
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    setInitialLoading(true);
    setError(null);
    listActivityPage(0, PAGE_SIZE)
      .then((res) => {
        if (cancelled) return;
        setEntries(res.entries);
        setPage(0);
        setHasMore(res.hasMore);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load activity'); })
      .finally(() => { if (!cancelled) setInitialLoading(false); });
    return () => { cancelled = true; };
  }, []));

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const next = page + 1;
    listActivityPage(next, PAGE_SIZE)
      .then((res) => {
        setEntries((prev) => [...prev, ...res.entries]);
        setPage(next);
        setHasMore(res.hasMore);
      })
      .catch(() => { /* keep what we have; button stays available to retry */ })
      .finally(() => setLoadingMore(false));
  }, [loadingMore, hasMore, page]);

  return (
    <Screen variant="canvas" edges={['bottom']}>
      <ScrollView className="bg-canvas-light dark:bg-canvas-dark" showsVerticalScrollIndicator={false}>
        <View className="gap-4 px-5 pb-8 pt-5">

          {error && entries.length === 0 ? (
            <View className="items-center gap-3 px-6 py-16">
              <Ionicons name="alert-circle-outline" size={32} color={P.muted} />
              <AppText className="text-center text-sm text-muted-light dark:text-muted-dark">{error}</AppText>
            </View>
          ) : initialLoading ? (
            <Card className="overflow-hidden p-0">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <SkeletonRow key={n} showDivider={n < 5} />
              ))}
            </Card>
          ) : entries.length === 0 ? (
            <View className="items-center gap-2 px-6 py-16">
              <Ionicons name="pulse-outline" size={26} color={P.placeholder} />
              <AppText className="text-center text-[13px] text-muted-light dark:text-muted-dark">
                No activity yet. Changes you make will show up here.
              </AppText>
            </View>
          ) : (
            <>
              <Card className="overflow-hidden p-0">
                {entries.map((item, i) => (
                  <ActivityRow
                    key={item.id}
                    item={item}
                    showDivider={i < entries.length - 1 || loadingMore}
                  />
                ))}
                {/* Skeletons for the page being fetched, appended below existing rows. */}
                {loadingMore && [0, 1, 2].map((n) => (
                  <SkeletonRow key={`sk-${n}`} showDivider={n < 2} />
                ))}
              </Card>

              {hasMore && !loadingMore && (
                <Pressable
                  onPress={loadMore}
                  style={pressScale}
                  className="flex-row items-center justify-center gap-1.5 self-center rounded-button bg-surface-low-light px-5 py-3 dark:bg-surface-low-dark"
                >
                  <AppText className="font-inter-semibold text-[13px]" style={{ color: P.primary }}>
                    Show more
                  </AppText>
                  <Ionicons name="chevron-down" size={16} color={P.primary} />
                </Pressable>
              )}

              {!hasMore && (
                <AppText className="py-2 text-center text-xs text-placeholder-light dark:text-placeholder-dark">
                  You&apos;re all caught up.
                </AppText>
              )}
            </>
          )}

        </View>
      </ScrollView>
    </Screen>
  );
}
