import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function Register() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!fullName || !email || !password) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });

if (error) {
  setLoading(false);
  Alert.alert('Registration failed', error.message);
  return;
}

if (data.user) {
  // Insert the profile into the users table
  const { error: profileError } = await supabase.from('users').insert({
    id: data.user.id,
    full_name: fullName,
    email: email,
    role: 'grandparent', // First user is the root/parent
    family_tree_id: null,
    parent_id: null,
  });

  if (profileError) {
    console.warn('Profile insert failed:', profileError.message);
  }
}

setLoading(false);
Alert.alert(
  'Account created!',
  'You can now sign in with your email and password.',
  [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join the family album</Text>

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor="#A8988D"
          value={fullName}
          onChangeText={setFullName}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#A8988D"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password (min 6 characters)"
          placeholderTextColor="#A8988D"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF8F0" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkText}>Already have an account? Sign In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF6EF', padding: 20 },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#FFF8F0', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#E8DFD4' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#3E2723', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#7A675B', textAlign: 'center', marginBottom: 24 },
  input: { backgroundColor: '#FAF6EF', borderRadius: 12, padding: 14, fontSize: 16, color: '#2D1A10', marginBottom: 12, borderWidth: 1, borderColor: '#E8DFD4' },
  button: { backgroundColor: '#3E2723', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#FFF8F0', fontSize: 16, fontWeight: '600' },
  linkText: { color: '#7BA05B', textAlign: 'center', marginTop: 16, fontSize: 14 },
});