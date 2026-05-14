import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { CaptureScreen } from '../screens/CaptureScreen';
import { FramesScreen } from '../screens/FramesScreen';
import { PosesScreen } from '../screens/PosesScreen';
import { TrainScreen } from '../screens/TrainScreen';
import { ViewScreen } from '../screens/ViewScreen';

export type RootStackParamList = {
  Home: undefined;
  Capture: undefined;
  Frames: { sessionId: string };
  Poses: { sessionId: string };
  Train: { sessionId: string };
  View: { sessionId?: string; splatUri?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#0b0b10' },
          headerTintColor: '#eee',
          contentStyle: { backgroundColor: '#0b0b10' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'GaussianSplat' }} />
        <Stack.Screen name="Capture" component={CaptureScreen} options={{ title: 'Capture' }} />
        <Stack.Screen name="Frames" component={FramesScreen} options={{ title: 'Frames' }} />
        <Stack.Screen name="Poses" component={PosesScreen} options={{ title: 'Poses' }} />
        <Stack.Screen name="Train" component={TrainScreen} options={{ title: 'Train' }} />
        <Stack.Screen name="View" component={ViewScreen} options={{ title: 'View' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
