// Optional demonstration controller. ESP32 Arduino core, no third-party library.
// Two buttons to GND with internal pull-ups. Three LEDs with suitable resistors.
// The browser handles routing and speech; this board sends events and indicates
// that guidance commands arrived. Never connect to a real alarm system.
const int KITCHEN_BUTTON = 18;
const int WEST_BUTTON = 19;
const int ROOM_A_LED = 25;
const int ROOM_B_LED = 26;
const int ROOM_C_LED = 27;

bool kitchenWasDown = false;
bool westWasDown = false;
String incoming = "";

void setup() {
  Serial.begin(115200);
  pinMode(KITCHEN_BUTTON, INPUT_PULLUP);
  pinMode(WEST_BUTTON, INPUT_PULLUP);
  pinMode(ROOM_A_LED, OUTPUT);
  pinMode(ROOM_B_LED, OUTPUT);
  pinMode(ROOM_C_LED, OUTPUT);
}

void loop() {
  bool kitchenDown = digitalRead(KITCHEN_BUTTON) == LOW;
  bool westDown = digitalRead(WEST_BUTTON) == LOW;
  if (kitchenDown && !kitchenWasDown) {
    Serial.println("{\"type\":\"hazard\",\"node\":\"KITCHEN\",\"active\":true}");
  }
  if (westDown && !westWasDown) {
    Serial.println("{\"type\":\"hazard\",\"node\":\"WEST_HALL\",\"active\":true}");
  }
  kitchenWasDown = kitchenDown;
  westWasDown = westDown;

  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n') {
      // Match the fixed node field of the trusted local browser protocol.
      // A production controller would use a proper JSON parser and validation.
      bool active = incoming.indexOf("\"message_id\":\"STANDBY\"") < 0;
      if (incoming.indexOf("\"node\":\"ROOM_A\"") >= 0) digitalWrite(ROOM_A_LED, active ? HIGH : LOW);
      if (incoming.indexOf("\"node\":\"ROOM_B\"") >= 0) digitalWrite(ROOM_B_LED, active ? HIGH : LOW);
      if (incoming.indexOf("\"node\":\"ROOM_C\"") >= 0) digitalWrite(ROOM_C_LED, active ? HIGH : LOW);
      incoming = "";
    } else if (incoming.length() < 512) {
      incoming += c;
    } else {
      incoming = "";
    }
  }
  delay(12);
}
