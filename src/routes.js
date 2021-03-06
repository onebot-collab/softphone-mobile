import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Toast from 'react-native-toast-message';

import Ionicons from 'react-native-vector-icons/Ionicons';

import { store } from './store';

import Softphone from './pages/Softphone';
import Configurations from './pages/Configurations';
import History from './pages/History';
import Chat from './pages/Chat';
import Contacts from './pages/Contacts';

const Tab = createBottomTabNavigator();

export default function Routes() {
  const { state } = useContext(store);

  return (
    <>
      <NavigationContainer>
        <Tab.Navigator
          initialRouteName="Softphone"
          tabBarOptions={{
            activeTintColor: '#ff9532',
            inactiveTintColor: '#555',
            showLabel: false,
          }}
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              if (route.name === 'Softphone') {
                iconName = focused ? 'call' : 'call-outline';
              }

              if (route.name === 'Contacts') {
                iconName = focused ? 'people' : 'people-outline';
              }

              if (route.name === 'History') {
                iconName = focused ? 'list' : 'list-outline';
              }

              if (route.name === 'Configurations') {
                iconName = focused ? 'build' : 'build-outline';
              }

              if (route.name === 'Chat') {
                iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarBadgeStyle: { backgroundColor: '#ff9532', color: '#fff' },
          })}>
          <Tab.Screen
            name="Softphone"
            component={Softphone}
            options={{
              tabBarBadge: state.phoneStatus === 'Registrado' ? null : 'falha',
            }}
          />
          <Tab.Screen name="Chat" component={Chat} />
          <Tab.Screen name="Contacts" component={Contacts} />
          <Tab.Screen
            name="History"
            component={History}
            options={{ tabBarBadge: state.notifications }}
          />
          <Tab.Screen name="Configurations" component={Configurations} />
        </Tab.Navigator>
      </NavigationContainer>
      <Toast ref={ref => Toast.setRef(ref)} />
    </>
  );
}
