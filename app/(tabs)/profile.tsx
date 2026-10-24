// FILE: app/(tabs)/profile.tsx
import { useEffect, useState } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, 
  Alert, ScrollView, Modal, TextInput, Image 
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getSignedImageUrl } from '../../lib/media';

export default function Profile() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [newAvatarBase64, setNewAvatarBase64] = useState<string | null>(null);
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
      
      if (data) {
        setProfile(data);
        setEditName(data.full_name || '');
        
        // Fetch the actual image from the private bucket
        if (data.avatar_url) {
          const signedUrl = await getSignedImageUrl(data.avatar_url);
          setAvatarUrl(signedUrl);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  // --- EDIT PROFILE LOGIC ---
  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square crop for profile pics
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setNewAvatarBase64(result.assets[0].base64);
      setNewAvatarUri(result.assets[0].uri);
    }
  };

  const saveProfileChanges = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      let finalAvatarPath = profile?.avatar_url;

      // 1. If a new avatar was picked, upload it
      if (newAvatarBase64) {
        const fileName = `${user.id}/avatar.jpg`;
        const arrayBuffer = decode(newAvatarBase64);

        const { error: uploadError } = await supabase.storage
          .from('family-media')
          .upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: true }); // upsert overrides old pic

        if (uploadError) throw uploadError;
        finalAvatarPath = fileName;
      }

      // 2. Update the users table
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          full_name: editName.trim(),
          avatar_url: finalAvatarPath 
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 3. Reload UI
      await loadProfile();
      setShowEditModal(false);
      setNewAvatarBase64(null);
      setNewAvatarUri(null);
      Alert.alert('Success', 'Profile updated!');

    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3E2723" /></View>;

  const initial = profile?.full_name?.charAt(0)?.toUpperCase() || '?';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        {/* Display Avatar */}
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
        </View>

        <Text style={styles.name}>{profile?.full_name || 'Family Member'}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
        
        <TouchableOpacity style={styles.editBtn} onPress={() => setShowEditModal(true)}>
          <Ionicons name="pencil" size={14} color="#FFF" />
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACTIONS</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Coming Soon')}>
          <Text style={styles.menuText}>Invite a family member</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Coming Soon')}>
          <Text style={styles.menuText}>Notification settings</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* --- EDIT PROFILE MODAL --- */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            {/* Avatar Picker */}
            <TouchableOpacity style={styles.pickAvatarBtn} onPress={pickAvatar}>
              {newAvatarUri || avatarUrl ? (
                <Image source={{ uri: newAvatarUri || avatarUrl! }} style={styles.previewAvatar} />
              ) : (
                <View style={styles.previewAvatarFallback}>
                  <Ionicons name="camera" size={30} color="#FFF" />
                </View>
              )}
              <Text style={styles.pickAvatarText}>Change Profile Picture</Text>
            </TouchableOpacity>

            {/* Name Input */}
            <Text style={styles.label}>Full Name</Text>
            <TextInput 
              style={styles.input} 
              value={editName} 
              onChangeText={setEditName} 
              placeholder="Enter your name" 
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowEditModal(false)} disabled={isSaving}>
                <Text style={{ color: '#7A675B', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.saveBtn} onPress={saveProfileChanges} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Save Changes</Text>}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF6EF' },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: 30 },
  avatarContainer: { marginBottom: 12 },
  avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#D4A24C' },
  avatarFallback: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#3E2723', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 40, color: '#FFF', fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#2D1A10' },
  email: { fontSize: 14, color: '#7A675B', marginTop: 4 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: '#3E2723', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  editBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#7A675B', letterSpacing: 1, marginBottom: 10 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF8F0', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E8DFD4', marginBottom: 10 },
  menuText: { fontSize: 16, color: '#2D1A10' },
  arrow: { fontSize: 20, color: '#A8988D' },
  signOutBtn: { marginHorizontal: 20, backgroundColor: '#8B2E2E', padding: 16, borderRadius: 12, alignItems: 'center' },
  signOutText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  
  // Modal Styles
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FAF6EF', padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D1A10', marginBottom: 20, textAlign: 'center' },
  pickAvatarBtn: { alignItems: 'center', marginBottom: 20 },
  previewAvatar: { width: 90, height: 90, borderRadius: 45, marginBottom: 8 },
  previewAvatarFallback: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#D4A24C', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  pickAvatarText: { color: '#3E2723', fontWeight: '600' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#2D1A10', marginBottom: 8 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E8DFD4', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  saveBtn: { backgroundColor: '#3E2723', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }
});