import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../auth/LoginScreen";
import SignupScreen from "../auth/SignupScreen";
import ForgotPasswordScreen from "../auth/ForgotPasswordScreen";

const Stack = createNativeStackNavigator();

export default function AuthNavigator({ setIsLoggedIn }: any) {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Login" options={{ headerShown: false }}>
        {(props) => (
          <LoginScreen {...props} setIsLoggedIn={setIsLoggedIn} />
        )}
      </Stack.Screen>

      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}