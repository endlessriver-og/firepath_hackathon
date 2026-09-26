// FirePath preparedness prototype: ESP32 Arduino core (C++).
// MQ-2 analog output -> GPIO33 through voltage divider if module output exceeds 3.3 V.
// Active buzzer control -> GPIO12 through an appropriate driver when needed.
// USB Serial at 115200. This is a demonstration sensor, not a certified alarm.
const int MQ2_PIN = 33;
const int BUZZER_PIN = 12;
const int MQ2_THRESHOLD = 1800; // Calibrate in your environment; not a safety threshold.
const unsigned long WARMUP_MS = 30000;
String commandLine = "";
bool sensorActive = false;
unsigned long nextRead = 0;
unsigned long beepUntil = 0;
unsigned long nextBeep = 0;

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  analogReadResolution(12);
}

void loop() {
  unsigned long now = millis();
  if (now >= nextRead) {
    nextRead = now + 500;
    int value = analogRead(MQ2_PIN);
    if (now > WARMUP_MS && (value > MQ2_THRESHOLD) != sensorActive) {
      sensorActive = value > MQ2_THRESHOLD;
      Serial.print("{\"type\":\"sensor\",\"sensor\":\"mq2\",\"active\":");
      Serial.print(sensorActive ? "true" : "false");
      Serial.print(",\"value\":"); Serial.print(value); Serial.println("}");
      if (sensorActive) beepUntil = now + 3000;
    }
  }
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n') {
      // Accept only the browser's fixed demo-alert command. Production firmware
      // needs strict JSON parsing, authentication, and a defined alert source.
      if (commandLine.indexOf("\"type\":\"alert\"") >= 0 && commandLine.indexOf("\"source\":\"demo\"") >= 0) {
        beepUntil = millis() + 3000;
      }
      commandLine = "";
    } else if (c != '\r' && commandLine.length() < 300) commandLine += c;
    else if (commandLine.length() >= 300) commandLine = "";
  }
  if (now < beepUntil) {
    if (now >= nextBeep) { digitalWrite(BUZZER_PIN, !digitalRead(BUZZER_PIN)); nextBeep = now + 220; }
  } else digitalWrite(BUZZER_PIN, LOW);
}
