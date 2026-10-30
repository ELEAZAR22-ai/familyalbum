// FILE: app/(tabs)/home.tsx
import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getSignedImageUrl } from '../../lib/media';

function MediaVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (player) => {
    player.muted = true;
  });

  return <VideoView player={player} style={styles.image} contentFit="cover" nativeControls={false} />;
}

export default function Home() {
  const router = useRouter();
  const [media, setMedia] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase.from('users').select('*').eq('id', user.id);
      if (profileData && profileData.length > 0) {
        setProfile(profileData[0]);
      }

      const { data: mediaData } = await supabase.from('media').select('*').order('created_at', { ascending: false });

      if (mediaData) {
        const mediaWithUrls = await Promise.all(
          mediaData.map(async (item) => {
            const url = await getSignedImageUrl(item.storage_path);
            return { ...item, displayUrl: url };
          })
        );
        setMedia(mediaWithUrls);
      }
    } catch (error: any) {
      console.error(error.message);
    }
  };

  useEffect(() => {
    loadData().then(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3E2723" /></View>;

  const initial = profile?.full_name?.charAt(0)?.toUpperCase() || '?';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View>
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.nameText}>{profile?.full_name || 'Family Member'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <FlatList
        data={media}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 20 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={() => (
          <Text style={{ textAlign: 'center', marginTop: 40, color: '#7A675B' }}>No media yet. Upload one!</Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push(`/media/${item.id}?type=${item.media_type}&path=${encodeURIComponent(item.storage_path)}`)}
          >
            {item.displayUrl ? (
              item.media_type === 'video' ? (
                <View style={styles.videoWrapper}>
                  <MediaVideo uri={item.displayUrl} />
                  <View style={styles.playIconOverlay}>
                    <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.8)" />
                  </View>
                </View>
              ) : (
                <Image source={{ uri: item.displayUrl }} style={styles.image} contentFit="cover" transition={200} />
              )
            ) : (
              <View style={[styles.image, styles.placeholder]}><Text>📷</Text></View>
            )}
            <Text style={styles.caption} numberOfLines={1}>{item.caption || 'No caption'}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6EF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF6EF' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#3E2723', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, color: '#FFF', fontWeight: 'bold' },
  welcomeText: { fontSize: 13, color: '#7A675B' },
  nameText: { fontSize: 20, fontWeight: 'bold', color: '#2D1A10' },
  card: { flex: 1, backgroundColor: '#FFF8F0', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E8DFD4' },
  image: { width: '100%', aspectRatio: 1, backgroundColor: '#E8DFD4' },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  videoWrapper: { position: 'relative', width: '100%', aspectRatio: 1 },
  playIconOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  caption: { fontSize: 12, fontWeight: '500', color: '#2D1A10', padding: 8 },
});