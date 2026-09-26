# Physical controller contract

## Minimum demo hardware

One USB-connected ESP32/Arduino controller, two momentary buttons, and two or three LEDs. The buttons represent detector events at `KITCHEN` and `WEST_HALL`. Each LED represents a notifier location (`ROOM_A`, `ROOM_B`, `ROOM_C`). A speaker or small audio module is optional. The browser itself can speak the messages for the first live run.

Open the dashboard in **Chrome or Edge on localhost** and click **Connect serial hardware**. Select the controller's USB serial port. The connection runs at **115200 baud**, one JSON object per newline. There is no cloud broker or Wi-Fi requirement.

## Controller to browser

Send one line when the kitchen button is pressed:

```json
{"type":"hazard","node":"KITCHEN","active":true}
```

Send another when the west hall button is pressed:

```json
{"type":"hazard","node":"WEST_HALL","active":true}
```

Set `active` to `false` to clear a hazard. Repeated reports of an unchanged state have no effect. Invalid JSON and unknown nodes are ignored. Valid names are `KITCHEN`, `WEST_HALL`, and all the node IDs in `src/model.js`.

## Browser to controller

Each state update produces **one line per notifier**. Example:

```json
{"type":"guidance","node":"ROOM_A","mode":"alert","message_id":"ALERT_ROOM_A_EAST_EXIT_KITCHEN_WEST_HALL","exit":"EAST_EXIT","path":["ROOM_A","WEST_JUNCTION","CENTER","EAST_JUNCTION","EAST_HALL","EAST_EXIT"],"text":"Fire alert. Leave Bedroom A. Turn left at the hallway. Continue to the east exit. Avoid the west hall.","language":"en"}
```

Message IDs encode mode, room, exit, and active hazards, for example `DRILL_ROOM_A_WEST_EXIT`, `ALERT_ROOM_A_WEST_EXIT_KITCHEN`, and `ALERT_ROOM_A_EAST_EXIT_KITCHEN_WEST_HALL`. This makes each spoken clip distinguishable by ID. `STANDBY` means turn off indicators and do not play audio; `NO_ROUTE` means there is no confirmed route. On the physical controller, route the command to the indicated node, light its LED in drill/alert state, and play a cached clip for `message_id` if audio hardware is available. For the first version, an LED plus the browser's spoken guidance is enough to demonstrate the feedback loop. Do not assume an ESP32 can read arbitrary text aloud without a separate playback or synthesis component.

If you generate ElevenLabs clips, `audio/device-manifest.json` maps `language:message_id` to an MP3 filename. Copy those MP3s to whichever audio player you use, then map the same identifiers in firmware. No API call is required when a button is pressed.

## Fast integration sequence

1. Flash the sample ESP32 sketch or send the two event lines from your own controller.
2. Connect the browser and press Kitchen. Confirm **kitchen fire** appears on the map and three guidance commands appear on USB serial.
3. Press West hall. Confirm **Bedroom A → East exit** in the dashboard and that its message ID changes to `ALERT_ROOM_A_EAST_EXIT_KITCHEN_WEST_HALL`.
4. If serial permissions or hardware fail, run the identical scenario with the on-screen buttons. The route engine and demo do not depend on hardware.

The sample sketch uses buttons on GPIO 18/19 with internal pull-ups and LEDs on GPIO 25/26/27 via appropriate resistors. Adapt pin assignments and voltage to the available board. The controller is strictly a simulation; it must not be wired into an actual alarm panel.
