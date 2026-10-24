// FILE: app/(tabs)/home.tsx
import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getSignedImageUrl } from '../../lib/media';

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

      // 1. Fetch Profile (Removed .single() to prevent crashes if row is missing)
      const { data: profileData } = await supabase.from('users').select('*').eq('id', user.id);
      if (profileData && profileData.length > 0) {
        setProfile(profileData[0]);
      } else {
        // Fallback if no row exists
        setProfile({ full_name: user.email?.split('@')[0] || 'User' });
      }

      // 2. Fetch Media
      const { data: mediaData, error } = await supabase
        .from('media')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (mediaData) {
        // 3. Generate Signed URLs for all photos
        const mediaWithUrls = await Promise.all(
  mediaData.map(async (item) => {
    const url = await getSignedImageUrl(item.storage_path);
    console.log("IMAGE PATH:", item.storage_path);
    console.log("GENERATED URL:", url);
    return { ...item, displayUrl: url };
          })
        );
        setMedia(mediaWithUrls);
      }
    } catch (error: any) {
      Alert.alert("Error loading feed", error.message);
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
      {/* Header with Profile Circle */}
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
          <Text style={{ textAlign: 'center', marginTop: 40, color: '#7A675B' }}>No photos yet. Upload one!</Text>
        )}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.displayUrl ? (
              <Image source={{ uri: item.displayUrl }} style={styles.image} contentFit="cover" transition={200} />
            ) : (
              <View style={[styles.image, styles.placeholder]}><Text>📷</Text></View>
            )}
            <Text style={styles.caption} numberOfLines={1}>{item.caption || 'No caption'}</Text>
          </View>
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
  caption: { fontSize: 12, fontWeight: '500', color: '#2D1A10', padding: 8 },
});