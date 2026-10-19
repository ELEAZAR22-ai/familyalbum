import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, Image, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';

interface MediaItem {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  media_type: 'photo' | 'video';
  caption: string | null;
  ceremony_tag: string | null;
  created_at: string;
}

export default function Home() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');

  async function fetchUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single();
    if (data) setUserName(data.full_name);
  }

  async function fetchMedia() {
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) setItems(data);
  }

  useEffect(() => {
    Promise.all([fetchUserProfile(), fetchMedia()]).then(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchUserProfile(), fetchMedia()]);
    setRefreshing(false);
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3E2723" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back{userName ? `, ${userName.split(' ')[0]}` : ''}</Text>
        <Text style={styles.title}>Family Feed</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📸</Text>
          <Text style={styles.emptyTitle}>No photos yet</Text>
          <Text style={styles.emptySubtitle}>
            Upload your first family memory from the Upload tab.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => {
            const { data } = supabase.storage
              .from('family-media')
              .getPublicUrl(item.storage_path);

            return (
              <View style={styles.card}>
                {item.media_type === 'photo' ? (
                  <Image source={{ uri: data.publicUrl }} style={styles.thumbnail} />
                ) : (
                  <View style={[styles.thumbnail, styles.videoPlaceholder]}>
                    <Text style={styles.videoIcon}>▶</Text>
                  </View>
                )}
                {item.caption ? (
                  <Text style={styles.caption} numberOfLines={1}>{item.caption}</Text>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6EF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF6EF' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  greeting: { fontSize: 13, color: '#7A675B', marginBottom: 2 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#3E2723' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#3E2723' },
  emptySubtitle: { fontSize: 14, color: '#7A675B', textAlign: 'center', marginTop: 8 },
  card: { flex: 1, backgroundColor: '#FFF8F0', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E8DFD4' },
  thumbnail: { width: '100%', aspectRatio: 1, backgroundColor: '#E8DFD4' },
  videoPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  videoIcon: { fontSize: 40, color: '#3E2723' },
  caption: { fontSize: 12, color: '#2D1A10', padding: 8, fontWeight: '500' },
});