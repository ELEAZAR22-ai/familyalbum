// FILE: app/(tabs)/profile.tsx
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function Profile() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch the profile from public.users
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(data || { email: user.email, full_name: 'User' });
      setLoading(false);
    }
    loadData();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3E2723" /></View>;

  const initial = profile?.full_name?.charAt(0)?.toUpperCase() || '?';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.name}>{profile?.full_name || 'Family Member'}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{profile?.role?.toUpperCase() || 'MEMBER'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>FAMILY STATS</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Family members</Text>
          <Text style={styles.rowValue}>1</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACTIONS</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Coming Soon', 'Inviting family members will be available in the next update.')}>
          <Text style={styles.menuText}>Invite a family member</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Coming Soon', 'Manage who can see your albums here.')}>
          <Text style={styles.menuText}>Manage access grants</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Coming Soon', 'Push notifications for new family uploads.')}>
          <Text style={styles.menuText}>Notification settings</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6EF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF6EF' },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: 30 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#3E2723', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 36, color: '#FFF', fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#2D1A10' },
  email: { fontSize: 14, color: '#7A675B', marginTop: 4 },
  badge: { marginTop: 12, backgroundColor: '#D4A24C', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: '#2D1A10' },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#7A675B', letterSpacing: 1, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFF8F0', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E8DFD4' },
  rowLabel: { fontSize: 16, color: '#2D1A10' },
  rowValue: { fontSize: 16, fontWeight: 'bold', color: '#3E2723' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF8F0', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E8DFD4', marginBottom: 10 },
  menuText: { fontSize: 16, color: '#2D1A10' },
  arrow: { fontSize: 20, color: '#A8988D' },
  signOutBtn: { marginHorizontal: 20, backgroundColor: '#8B2E2E', padding: 16, borderRadius: 12, alignItems: 'center' },
  signOutText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});