// FILE: app/(tabs)/profile.tsx
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Modal, TextInput, Switch, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getSignedImageUrl } from '../../lib/media';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { Ionicons } from '@expo/vector-icons';

export default function Profile() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [activeModal, setActiveModal] = useState<'invite' | 'access' | 'notifications' | 'members' | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
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

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase.from('users').select('*').eq('id', user.id);
      const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });

      setProfile(profileData?.[0] || { full_name: user.email?.split('@')[0] });
      setMemberCount(count || 1);
      setLoading(false);
    }
    loadData();
  }, []);

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
        <View style={styles.avatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
        </View>
        <Text style={styles.name}>{profile?.full_name || 'Family Member'}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>FAMILY STATS</Text>
        <TouchableOpacity style={styles.row} onPress={() => setActiveModal('members')}>
          <Text style={styles.rowLabel}>Family members</Text>
          <Text style={styles.rowValue}>{memberCount} ›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACTIONS</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => setActiveModal('invite')}>
          <Text style={styles.menuText}>Invite a family member</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => setActiveModal('access')}>
          <Text style={styles.menuText}>Manage access grants</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => setActiveModal('notifications')}>
          <Text style={styles.menuText}>Notification settings</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      

      {/* Universal Modal for all actions */}
      <Modal visible={activeModal !== null} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            {/* INVITE MODAL */}

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




            {activeModal === 'invite' && (
              <>
              
                <Text style={styles.modalTitle}>Invite Member</Text>
                <TextInput style={styles.input} placeholder="Email address" value={inviteEmail} onChangeText={setInviteEmail} autoCapitalize="none" />
                <TouchableOpacity style={styles.createBtn} onPress={() => {
                  Alert.alert('Invite Sent!', `Invited ${inviteEmail}`);
                  setActiveModal(null); setInviteEmail('');
                }}><Text style={{ color: '#FFF', fontWeight: 'bold' }}>Send Invite</Text></TouchableOpacity>
              </>
            )}

            {/* ACCESS GRANTS MODAL */}
            {activeModal === 'access' && (
              <>
                <Text style={styles.modalTitle}>Manage Access</Text>
                <Text style={{ color: '#7A675B', marginBottom: 20 }}>By default, family members can only see photos of their ancestors and descendants. To share a specific album with a sibling, you must grant them access here.</Text>
                <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Your Albums:</Text>
                <Text style={{ color: '#7A675B', fontStyle: 'italic' }}>No albums available to grant.</Text>
              </>
            )}

            {/* NOTIFICATIONS MODAL */}
            {activeModal === 'notifications' && (
              <>
                <Text style={styles.modalTitle}>Notifications</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <Text style={{ fontSize: 16 }}>New photo alerts</Text>
                  <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ true: '#7BA05B' }} />
                </View>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowEditModal(false)} disabled={isSaving}>
                <Text style={{ color: '#7A675B', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.saveBtn} onPress={saveProfileChanges} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Save Changes</Text>}
              </TouchableOpacity>
            </View>

            {/* MEMBERS MODAL */}
            {activeModal === 'members' && (
              <>
                <Text style={styles.modalTitle}>Family Members ({memberCount})</Text>
                <View style={{ padding: 16, backgroundColor: '#FFF', borderRadius: 8, marginBottom: 10 }}>
                  <Text style={{ fontWeight: 'bold' }}>{profile?.full_name} (You)</Text>
                  <Text style={{ color: '#7A675B' }}>{profile?.email}</Text>
                </View>
              </>
            )}

            <TouchableOpacity style={{ marginTop: 20, alignItems: 'center' }} onPress={() => setActiveModal(null)}>
              <Text style={{ color: '#7A675B', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
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
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#3E2723', justifyContent: 'center', alignItems: 'center', marginBottom: 12, overflow: 'hidden' },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  avatarText: { fontSize: 36, color: '#FFF', fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#2D1A10' },
  email: { fontSize: 14, color: '#7A675B', marginTop: 4 },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#7A675B', letterSpacing: 1, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFF8F0', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E8DFD4' },
  rowLabel: { fontSize: 16, color: '#2D1A10' },
  rowValue: { fontSize: 16, fontWeight: 'bold', color: '#3E2723' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF8F0', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E8DFD4', marginBottom: 10 },
  menuText: { fontSize: 16, color: '#2D1A10' },
  arrow: { fontSize: 20, color: '#A8988D' },
  signOutBtn: { marginHorizontal: 20, backgroundColor: '#8B2E2E', padding: 16, borderRadius: 12, alignItems: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#2D1A10', marginBottom: 8 },
  pickAvatarText: { color: '#3E2723', fontWeight: '600' },
  signOutText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },

  modalCard: { backgroundColor: '#FAF6EF', padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D1A10', marginBottom: 16 },
  pickAvatarBtn: { alignSelf: 'center', marginBottom: 16 },
  previewAvatar: { width: 80, height: 80, borderRadius: 40 },
  previewAvatarFallback: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3E2723', justifyContent: 'center', alignItems: 'center' },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E8DFD4', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 20 },
  saveBtn: { backgroundColor: '#3E2723', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  createBtn: { backgroundColor: '#3E2723', padding: 14, borderRadius: 8, alignItems: 'center' }
});