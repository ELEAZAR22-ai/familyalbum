import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter both email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      Alert.alert('Login failed', error.message);
    } else {
      router.replace('/(tabs)/home');
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>FamilyVault</Text>
        <Text style={styles.subtitle}>Sign in to your family album</Text>

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
          placeholder="Password"
          placeholderTextColor="#A8988D"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF8F0" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/registry')}>
          <Text style={styles.linkText}>Don&apos;t have an account? Register</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF6EF', padding: 20 },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#FFF8F0', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#E8DFD4' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#3E2723', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#7A675B', textAlign: 'center', marginBottom: 24 },
  input: { backgroundColor: '#FAF6EF', borderRadius: 12, padding: 14, fontSize: 16, color: '#2D1A10', marginBottom: 12, borderWidth: 1, borderColor: '#E8DFD4' },
  button: { backgroundColor: '#3E2723', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#FFF8F0', fontSize: 16, fontWeight: '600' },
  linkText: { color: '#7BA05B', textAlign: 'center', marginTop: 16, fontSize: 14 },
});