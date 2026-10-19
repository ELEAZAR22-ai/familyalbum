
// FILE: app/(tabs)/upload.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Modal, Pressable, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer'; // Add this at the top
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

interface Album { id: string; title: string; }
interface SelectedMedia { id: string; uri: string; type: 'photo' | 'video'; mimeType: string; }

const CEREMONY_OPTIONS = ['Wedding', 'Birthday', 'Funeral', 'Naming Ceremony', 'Anniversary', 'Other'];

export default function UploadScreen() {
  const router = useRouter();
  const [pickedMediaList, setPickedMediaList] = useState<SelectedMedia[]>([]);
  const [caption, setCaption] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);

  useEffect(() => { fetchUserAlbums(); }, []);

  const fetchUserAlbums = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('albums').select('id, title').eq('owner_id', user.id);
    if (data && data.length > 0) {
      setAlbums(data);
      setSelectedAlbumId(data[0].id);
    }
  };

  const handlePickMedia = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission needed', 'Allow gallery access to upload.');

    const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.All,
  allowsMultipleSelection: true,
  quality: 0.7,
  base64: true, // ADD THIS
    });

    if (!result.canceled) {
      const newItems = result.assets.map((asset, i) => {
        // Force a safe mime type for Android
        const isVideo = asset.type === 'video';
        return {
          id: `${Date.now()}_${i}`,
          uri: asset.uri,
          type: isVideo ? 'video' : 'photo',
          mimeType: isVideo ? 'video/mp4' : 'image/jpeg', 
        } as SelectedMedia;
      });
      setPickedMediaList(prev => [...prev, ...newItems]);
    }
  };

  const handleCreateNewAlbum = async () => {
    if (!newAlbumTitle.trim()) return Alert.alert('Error', 'Album name required');
    setIsCreatingAlbum(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase.from('albums').insert({
      owner_id: user?.id, title: newAlbumTitle.trim(), visibility: 'lineal'
    }).select('id, title').single();

    if (error) {
      Alert.alert('Error', error.message);
    } else if (data) {
      setAlbums([data, ...albums]);
      setSelectedAlbumId(data.id);
      setShowAlbumModal(false);
      setNewAlbumTitle('');
    }
    setIsCreatingAlbum(false);
  };

const handleSubmit = async () => {
  if (pickedMediaList.length === 0) return Alert.alert('No Media', 'Please pick a photo or video first.');
  if (!selectedAlbumId) return Alert.alert('No Album', 'Please create an album first.');

  setIsUploading(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not logged in");

    for (let i = 0; i < pickedMediaList.length; i++) {
      const item = pickedMediaList[i];
      
      // 1. Get the file as base64 (requires re-picking with base64: true)
      // NOTE: You must update handlePickMedia to include base64: true
      const response = await fetch(item.uri);
      const blob = await response.blob();
      
      // 2. Convert Blob to ArrayBuffer for Supabase
      const arrayBuffer = await new Response(blob).arrayBuffer();
      
      const fileExt = item.type === 'video' ? 'mp4' : 'jpg';
      const fileName = `${user.id}/${Date.now()}_${i}.${fileExt}`;

      // 3. Upload with explicit contentType
      const { error: uploadError } = await supabase.storage
        .from('family-media')
        .upload(fileName, arrayBuffer, { 
          contentType: item.type === 'video' ? 'video/mp4' : 'image/jpeg' 
        });

      if (uploadError) throw new Error(`Storage error: ${uploadError.message}`);

      // 4. Save to database
      const { error: dbError } = await supabase.from('media').insert({
        album_id: selectedAlbumId,
        uploader_id: user.id,
        media_type: item.type,
        storage_path: fileName,
        caption: caption.trim() || null,
        ceremony_tag: selectedTag || null,
      });

      if (dbError) throw new Error(`Database error: ${dbError.message}`);
    }

    Alert.alert('Success', 'Memories saved to the vault!');
    setPickedMediaList([]);
    setCaption('');
    setSelectedTag('');
    router.push('/(tabs)/home');
  } catch (err: any) {
    Alert.alert('Upload Failed', err.message);
  } finally {
    setIsUploading(false);
  }
};

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
      <Text style={styles.title}>Upload</Text>
      
      {/* Media Picker Box */}
      <TouchableOpacity style={styles.uploadBox} onPress={handlePickMedia}>
        <Ionicons name="images-outline" size={40} color="#D4A24C" />
        <Text style={styles.uploadBoxText}>
          {pickedMediaList.length > 0 ? `${pickedMediaList.length} items selected` : 'Tap to select photos/videos'}
        </Text>
      </TouchableOpacity>

      {/* Album Selector */}
      <View style={styles.row}>
        <Text style={styles.label}>Album</Text>
        <TouchableOpacity onPress={() => setShowAlbumModal(true)}>
          <Text style={styles.linkText}>+ New Album</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
        {albums.map(a => (
          <TouchableOpacity 
            key={a.id} 
            style={[styles.chip, selectedAlbumId === a.id && styles.chipActive]}
            onPress={() => setSelectedAlbumId(a.id)}
          >
            <Text style={[styles.chipText, selectedAlbumId === a.id && styles.chipTextActive]}>{a.title}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Caption & Tag */}
      <Text style={styles.label}>Caption</Text>
      <TextInput style={styles.input} placeholder="Describe this memory..." value={caption} onChangeText={setCaption} />
      
      <Text style={styles.label}>Occasion</Text>
      <View style={styles.tagGrid}>
        {CEREMONY_OPTIONS.map(tag => (
          <TouchableOpacity key={tag} style={[styles.tag, selectedTag === tag && styles.tagActive]} onPress={() => setSelectedTag(selectedTag === tag ? '' : tag)}>
            <Text style={[styles.tagText, selectedTag === tag && styles.tagTextActive]}>{tag}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={isUploading}>
        {isUploading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Save to Family Vault</Text>}
      </TouchableOpacity>

      {/* Create Album Modal */}
      <Modal visible={showAlbumModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.label}>New Album Name</Text>
            <TextInput style={styles.input} placeholder="e.g. 2026 Reunion" value={newAlbumTitle} onChangeText={setNewAlbumTitle} />
            <View style={styles.row}>
              <TouchableOpacity onPress={() => setShowAlbumModal(false)}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleCreateNewAlbum} disabled={isCreatingAlbum}>
                {isCreatingAlbum ? <ActivityIndicator size="small" /> : <Text style={styles.linkText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6EF' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#2D1A10', marginBottom: 20 },
  uploadBox: { height: 150, borderWidth: 2, borderColor: '#E8DFD4', borderStyle: 'dashed', borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8F0', marginBottom: 20 },
  uploadBoxText: { marginTop: 10, color: '#7A675B', fontWeight: '600' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#2D1A10', marginBottom: 8 },
  input: { backgroundColor: '#FFF8F0', borderWidth: 1, borderColor: '#E8DFD4', borderRadius: 12, padding: 14, marginBottom: 20, fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  linkText: { color: '#D4A24C', fontWeight: 'bold' },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF8F0', borderWidth: 1, borderColor: '#E8DFD4', marginRight: 10 },
  chipActive: { backgroundColor: '#3E2723', borderColor: '#3E2723' },
  chipText: { color: '#2D1A10' },
  chipTextActive: { color: '#FFF' },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 },
  tag: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E8DFD4' },
  tagActive: { backgroundColor: '#7BA05B', borderColor: '#7BA05B' },
  tagText: { color: '#2D1A10' },
  tagTextActive: { color: '#FFF' },
  btn: { backgroundColor: '#3E2723', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FAF6EF', padding: 20, borderRadius: 16 }
});