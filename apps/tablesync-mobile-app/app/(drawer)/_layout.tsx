import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Drawer } from 'expo-router/drawer';

export default function DrawerLayout() {
  const colorScheme = useColorScheme();

  return (
    <Drawer
      screenOptions={{
        headerShown: true, // Garante que o Header no topo apareça
        headerTintColor: Colors[colorScheme ?? 'light'].text,
        drawerActiveTintColor: '#007AFF',
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#121212' : '#FFFFFF',
        },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          drawerLabel: 'Restaurantes',
          title: 'Tablesync', // Texto que aparece no centro do Header
          drawerIcon: ({ color, size }) => (
            <Ionicons name="restaurant-outline" size={size} color={color} />
          ),
        }}
      />
      
      {/* Ocultamos a rota de setores do menu da gaveta, mas mantemos o Header para ela */}
      <Drawer.Screen
        name="sectors/[id]"
        options={{
          drawerItemStyle: { display: 'none' }, 
          title: 'Seleção de Setor',
          drawerLabel: 'Reservar',
        }}
      />
    </Drawer>
  );
}