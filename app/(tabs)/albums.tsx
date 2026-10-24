// FILE: app/(tabs)/albums.tsx
import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Modal, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface Album { id: string; title: string; created_at: string; }

export default function Albums() {
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  async function fetchAlbums() {
    const { data } = await supabase.from('albums').select('*').order('created_at', { ascending: false });
    if (data) setAlbums(data);
  }

  useEffect(() => { fetchAlbums().then(() => setLoading(false)); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAlbums();
    setRefreshing(false);
  }, []);

  async function handleCreateAlbum() {
    if (!newTitle.trim()) return Alert.alert('Error', 'Album name cannot be empty');
    setIsCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('albums').insert({
      owner_id: user.id, title: newTitle.trim(), visibility: 'lineal',
    });

    setIsCreating(false);
    if (error) Alert.alert('Error', error.message);
    else { setShowModal(false); setNewTitle(''); fetchAlbums(); }
  }

  // --- NEW: Delete Album Function ---
  const confirmDeleteAlbum = (albumId: string, albumTitle: string) => {
    Alert.alert(
      "Delete Album",
      `Are you sure you want to delete "${albumTitle}"? All photos inside will be permanently removed.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => deleteAlbum(albumId)
        }
      ]
    );
  };

  const deleteAlbum = async (albumId: string) => {
    try {
      // 1. Fetch all media paths in this album to delete from storage
      const { data: mediaData } = await supabase.from('media').select('storage_path').eq('album_id', albumId);
      
      if (mediaData && mediaData.length > 0) {
        const filesToDelete = mediaData.map(m => m.storage_path);
        // Delete from Storage
        await supabase.storage.from('family-media').remove(filesToDelete);
      }

      // 2. Delete from Database (This will cascade delete the media rows if set up in SQL)
      const { error } = await supabase.from('albums').delete().eq('id', albumId);
      
      if (error) throw error;
      
      // 3. Update UI
      setAlbums(prev => prev.filter(a => a.id !== albumId));
      Alert.alert('Deleted', 'Album removed successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not delete album.');
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3E2723" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Albums</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={albums}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 20 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={() => (
          <Text style={{ textAlign: 'center', marginTop: 40, color: '#7A675B' }}>No albums yet. Tap "+ New" to start.</Text>
        )}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/album/${item.id}`)}>
              <View style={styles.placeholder}><Text style={{ fontSize: 30 }}>📷</Text></View>
              <Text style={styles.albumTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </TouchableOpacity>
            
            {/* Delete Button */}
            <TouchableOpacity 
              style={styles.deleteBtn} 
              onPress={() => confirmDeleteAlbum(item.id, item.title)}
            >
              <Ionicons name="trash-outline" size={16} color="#8B2E2E" />
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Create Album Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create New Album</Text>
            <TextInput style={styles.input} placeholder="e.g. Grandma's 80th" value={newTitle} onChangeText={setNewTitle} autoFocus />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowModal(false)}><Text style={{ color: '#7A675B', fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={handleCreateAlbum} disabled={isCreating}>
                {isCreating ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6EF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF6EF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#3E2723' },
  addBtn: { backgroundColor: '#3E2723', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addBtnText: { color: '#FFF', fontWeight: 'bold' },
  cardWrapper: { flex: 1, position: 'relative' },
  card: { backgroundColor: '#FFF8F0', borderRadius: 16, padding: 10, borderWidth: 1, borderColor: '#E8DFD4' },
  placeholder: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#E8DFD4', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  albumTitle: { fontSize: 14, fontWeight: 'bold', color: '#2D1A10' },
  date: { fontSize: 11, color: '#7A675B', marginTop: 2 },
  deleteBtn: { position: 'absolute', top: 16, right: 16, backgroundColor: '#FDF2F2', padding: 6, borderRadius: 20, borderWidth: 1, borderColor: '#F3D6D6' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FAF6EF', padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D1A10', marginBottom: 16 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E8DFD4', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, alignItems: 'center' },
  createBtn: { backgroundColor: '#3E2723', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }
});