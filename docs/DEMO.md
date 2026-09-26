# Three-minute preparedness demo

1. Open the home page. Explain the problem: residents need a view of their **own mapped hazards** and a short, practical household plan.
2. Enter a Glendale street address in the app on a machine with the GIS snapshot installed. For an offline bench demo, enter a Glendale latitude and longitude; the backend checks the downloaded map snapshot locally. The address route sends the address to the City's geocoder when submitted.
3. Show the seven source-linked layers, including the different meaning of FEMA Zone X versus a Special Flood Hazard Area. Point out snapshot dates and the absence of live incident data.
4. Select renter/owner, pets or assistance, then show the checklist adapt. Check off an item and refresh to show browser-local progress.
5. Open official Everbridge and Know Your Zone links. Press **Send demo alert** and connect an ESP32 over USB if available. Explain that this is a simulation; real city alert ingestion and cellular fallback are follow-on work.
6. Open **fire-lab.html** only if there is time to show the earlier interior routing experiment.

If the GIS package or network geocoder is unavailable, the app keeps a general checklist and explicitly labels map layers unavailable/pending rather than making up an address result.
