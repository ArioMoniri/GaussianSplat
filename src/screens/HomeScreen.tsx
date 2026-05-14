import { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { sessionStore } from '../services/sessionStore';
import { CaptureSession } from '../types';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const [sessions, setSessions] = useState<CaptureSession[]>([]);

  useEffect(() => sessionStore.subscribe(setSessions), []);

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>Sessions</Text>

      <View style={styles.actionRow}>
        <PrimaryButton label="New capture" onPress={() => navigation.navigate('Capture')} />
        <PrimaryButton
          label="Open viewer"
          onPress={() => navigation.navigate('View', {})}
          variant="secondary"
        />
      </View>

      <FlatList
        style={styles.list}
        data={sessions}
        keyExtractor={(s) => s.id}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No sessions yet. Tap “New capture” to record video, or “Open viewer” to inspect a
            pre-trained splat.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              navigation.navigate(item.splatUri ? 'View' : 'Frames', {
                sessionId: item.id,
              })
            }
          >
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSub}>
              {new Date(item.createdAt).toLocaleString()}
              {item.frames ? ` · ${item.frames.length} frames` : ''}
              {item.poses ? ' · poses ✓' : ''}
              {item.splatUri ? ' · splat ✓' : ''}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        variant === 'secondary' ? styles.btnSecondary : styles.btnPrimary,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={styles.btnLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 20 },
  heading: { color: '#eee', fontSize: 22, fontWeight: '600', marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    flex: 1,
    alignItems: 'center',
  },
  btnPrimary: { backgroundColor: '#5b8def' },
  btnSecondary: { backgroundColor: '#2a2a36' },
  btnLabel: { color: 'white', fontWeight: '600' },
  list: { flex: 1 },
  card: {
    backgroundColor: '#15151c',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  cardTitle: { color: '#eee', fontSize: 16, fontWeight: '600' },
  cardSub: { color: '#999', marginTop: 4, fontSize: 12 },
  empty: { color: '#888', textAlign: 'center', marginTop: 40, lineHeight: 20 },
});
