// FILE: app/media/[id].tsx
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getSignedImageUrl } from '../../lib/media';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function MediaViewer() {
  const { type, path } = useLocalSearchParams<{ type: string, path: string }>();
  const router = useRouter();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const player = useVideoPlayer(url, player => {
    player.loop = true;
  });

  useEffect(() => {
    if (url && type === 'video') player.play();
  }, [url, type, player]);

  useEffect(() => {
    async function loadUrl() {
      if (path) {
        const signedUrl = await getSignedImageUrl(path);
        setUrl(signedUrl);
      }
      setLoading(false);
    }
    loadUrl();
  }, [path]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FFF" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>

      {url ? (
        type === 'video' ? (
          <VideoView
            player={player}
            style={styles.media}
            nativeControls
            contentFit="contain"
          />
        ) : (
          <Image source={{ uri: url }} style={styles.media} contentFit="contain" />
        )
      ) : (
        <Text style={{ color: '#FFF' }}>Could not load media.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  header: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
  backBtn: { padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  media: { width: width, height: height },
});