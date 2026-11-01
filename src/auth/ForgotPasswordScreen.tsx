import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";

export default function ForgotPasswordScreen() {
  return (
    <View style={{ flex: 1, padding: 25 }}>
      <Text
        style={{
          fontSize: 28,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        Reset Password
      </Text>

      <TextInput
        placeholder="Email Address"
        style={{
          borderWidth: 1,
          padding: 15,
          marginBottom: 20,
        }}
      />

      <TouchableOpacity
        style={{
          backgroundColor: "#0066ff",
          padding: 15,
          borderRadius: 10,
        }}
      >
        <Text
          style={{
            color: "white",
            textAlign: "center",
          }}
        >
          Send Reset Link
        </Text>
      </TouchableOpacity>
    </View>
  );
}