// FILE: app/album/[id].tsx
import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function AlbumDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMedia() {
      const { data, error } = await supabase
        .from('media')
        .select('*')
        .eq('album_id', id)
        .order('created_at', { ascending: false });
      
      if (!error && data) setMedia(data);
      setLoading(false);
    }
    fetchMedia();
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3E2723" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Album Photos</Text>
        <View style={{ width: 50 }} />
      </View>

      {media.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: '#7A675B' }}>No photos in this album yet.</Text>
        </View>
      ) : (
        <FlatList
          data={media}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 20 }}
          contentContainerStyle={{ gap: 12, paddingVertical: 20 }}
          renderItem={({ item }) => {
            // For now, show a placeholder since the bucket is private
            // Later we'll add signed URLs
            return (
              <View style={styles.mediaCard}>
                <View style={styles.placeholder}>
                  <Text style={{ fontSize: 30 }}>📷</Text>
                </View>
                <Text style={styles.caption} numberOfLines={1}>{item.caption || 'No caption'}</Text>
                <Text style={styles.tag}>{item.ceremony_tag || 'No tag'}</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  backText: { fontSize: 16, color: '#D4A24C', fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#3E2723' },
  mediaCard: { flex: 1, backgroundColor: '#FFF8F0', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#E8DFD4' },
  placeholder: { width: '100%', aspectRatio: 1, backgroundColor: '#E8DFD4', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  caption: { fontSize: 12, fontWeight: '600', color: '#2D1A10', marginTop: 6 },
  tag: { fontSize: 10, color: '#7A675B' },
});