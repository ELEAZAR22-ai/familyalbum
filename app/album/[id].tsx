// FILE: app/album/[id].tsx
import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getSignedImageUrl } from '../../lib/media';

function VideoThumbnail({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (player) => {
    player.muted = true;
  });

  return <VideoView player={player} style={styles.image} contentFit="cover" nativeControls={false} />;
}

export default function AlbumDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMedia = async () => {
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .eq('album_id', id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      const withUrls = await Promise.all(
        data.map(async (item) => {
          const url = await getSignedImageUrl(item.storage_path);
          return { ...item, displayUrl: url };
        })
      );
      setMedia(withUrls);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMedia();
  }, [id]);

  const confirmDeleteMedia = (mediaId: string, storagePath: string) => {
    Alert.alert(
      "Delete Media",
      "Are you sure you want to permanently delete this memory?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => deleteMedia(mediaId, storagePath)
        }
      ]
    );
  };

  const deleteMedia = async (mediaId: string, storagePath: string) => {
    try {
      await supabase.storage.from('family-media').remove([storagePath]);
      const { error: dbError } = await supabase.from('media').delete().eq('id', mediaId);
      if (dbError) throw dbError;
      setMedia(prev => prev.filter(m => m.id !== mediaId));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not delete media.');
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3E2723" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Album Media</Text>
        <View style={{ width: 50 }} />
      </View>

      <FlatList
        data={media}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 20 }}
        contentContainerStyle={{ gap: 12, paddingVertical: 20 }}
        ListEmptyComponent={() => (
          <Text style={{ textAlign: 'center', marginTop: 40, color: '#7A675B' }}>No media in this album yet.</Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.mediaCard}
            onPress={() => router.push(`/media/${item.id}?type=${item.media_type}&path=${encodeURIComponent(item.storage_path)}`)}
          >
            {item.displayUrl ? (
              item.media_type === 'video' ? (
                <View style={styles.videoWrapper}>
                  <VideoThumbnail uri={item.displayUrl} />
                  <View style={styles.playIconOverlay}>
                    <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.8)" />
                  </View>
                </View>
              ) : (
                <Image source={{ uri: item.displayUrl }} style={styles.image} contentFit="cover" />
              )
            ) : (
              <View style={[styles.image, styles.placeholder]}><Text>📷</Text></View>
            )}
            
            <View style={styles.textContainer}>
              <Text style={styles.caption} numberOfLines={1}>{item.caption || 'No caption'}</Text>
              <Text style={styles.tag}>{item.ceremony_tag || 'No tag'}</Text>
            </View>

            <TouchableOpacity 
              style={styles.deleteBtn} 
              onPress={(e) => {
                e.stopPropagation();
                confirmDeleteMedia(item.id, item.storage_path);
              }}
            >
              <Ionicons name="trash" size={14} color="#FFF" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6EF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF6EF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  backBtn: { padding: 5 },
  backText: { fontSize: 16, color: '#D4A24C', fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#3E2723' },
  mediaCard: { flex: 1, backgroundColor: '#FFF8F0', borderRadius: 12, borderWidth: 1, borderColor: '#E8DFD4', overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 1, backgroundColor: '#E8DFD4' },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  videoWrapper: { position: 'relative', width: '100%', aspectRatio: 1 },
  playIconOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  textContainer: { padding: 8 },
  caption: { fontSize: 12, fontWeight: '600', color: '#2D1A10' },
  tag: { fontSize: 10, color: '#7A675B' },
  deleteBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(139, 46, 46, 0.9)', padding: 6, borderRadius: 20 }
});