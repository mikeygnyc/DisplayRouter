# Admin and API Updates

## Summary
The current admin ui and simulator is not intuitive or complete.

There needs to be a modern UI framework underlaying it all. Read through the below before deciding on an appropriate framework suggestion. Also see further below on spec updates.

## Admin UI

- Each of the subsections should be a tab with some changes as discussed.
- Any data entry or editing should be guided through wizard or editor type features
- All data entry should be validated
- Wherever possible, field values should be from controlled dictionaries or similar or choosers from lists of system resources as appropriate.
- Payload type editing should be made available.
- Color parameters should be chosen through a standard picker with defaults/recents available
- All of the options and addresses for the simulator/playground are very confusing and not really necessary. Let's do the following:
     + In addition to any sim displays in the docker-compose (or actual deploy), there should be a a sim display dedicated solely to the playground/admin ui, sort of an "admin sim display". For compactness this should be part of the admin ui container.
     + The playground needs a re-work. The presets are a good start but there should also be a "smart" editor or builder that lets the user see the available parameters and choose them and set them (with appropriate pickers where necessary). It should also allow testing out commands.
     + A separate Jinja scratchpad/workspace would be very helpful (similar to the "Templates" dev page in HomeAssistant) for templates. This would allow for experimenting with Jinja and available system variables (possible via a `payloadtype.field` format). References to Jinja syntax should be made available (either on the web or local). The playground should be presented as an option to assist in creation, either come up as a popup/modal or be in a section of the template editing page. Options selected in the playground should be copied into the template created. Finally linting/validating the template should happen as the template is edited with errors shown as they occur (again similar to HA) and if the template is valid, the output it generates should be available on the admin sim ui.
     + When selecting templates, dummy data should be available and which immediately is piped into the admin sim display for previewing.
- The API docs should be available in the admin ui and should be interactive (allowing for trying out calls and seeing responses). This can be done through a local hosting of the OpenAPI/Async docs or through a 3rd party library that can read those docs and generate an interactive UI. This would allow users to get familiar with the API and test out calls without needing to use external tools like Postman.
- The broadcast tools on the UI should allow using either text (plain or rich, scrolled or static), an image, an animation, or the output of a temporary playground session. Separately there should be the option for stream commands.
## API Updates
- Payloads should have an optional `tags` field which is an array of strings that any client can insert values of interest for use in rules processing.
- Payloads should have an optional start and stop validity timestamp. If present these values dictate when the payload can be displayed. Payloads with these values set should be stored in a cache until they expire. If they are currently displayed on a display at expiry, they should be cleared.
- The available transition types are `cut`, `slide`, `fade`, `barn_door`, `wipe`
- Additional transition paramters
     + `cut`, `slide`, `fade`, `barn_door`, `wipe`: `delay` - time in ms to delay onset of transition
     + `slide`, `fade`, `barn_door`, `wipe`: `duration` - time in ms to to fully execute transition
     + `slide`, `wipe`: `direction` - `left`, `right`, `up`, `down`
     + `fade`: `fade_in` and `fade_out` times in ms
     + `barn_door`: `direction` - `horizontal`, `vertical`
- Payload types:
     + `raw_[x]`: where x is each type of object the `rgbmatrix` library exposes. Displays will make a best effort to display full object but will truncate the image if they can't fit the entire object.
     + `simple_text_scroll`: a simple text marquee scroller, can specify number of lines, colors, and strings for each line. Displays will make a best effort to display all lines but may truncate lines if unable.
     + `simple_text_page`: a text 'page' display. An array of strings representing each page and settings for number of lines, colors (array for per line and per page), and dwell time on each page. Displays lays will make a best effort to display all lines but may truncate lines if unable.
     + `simple_text_scroll` and `simple_text_page` should support basic text formatting (bold, italic, underline) and emojis. Formatting can be done through markdown or similar syntax.
     + `clock`: a simple clock display with settings for clock type, time format, colors, and optional date display. The source and timezone and display formats should be configurable in the admin ui. An option for multiple clocks with labels in different time zones on different payloads should be allowed. While this can all originate from clients, this should be available to be generated solely by the router.
     + `weather`: a simple weather display with settings for location, data source, colors, and optional icons. Forecasts can also be added with customizable durations and levels of detail. The data source (including keys, ids, etc) and display units should be configurable in the admin ui. sources available should be commonly available weather APIs both free and paid. An option for multiple weather and forecast in different locations with labels on different payloads should be allowed. While this can all originate from clients, this should be available to be generated solely by the router.
     + `image`: a simple image display with settings for scaling, cropping, and color adjustments.
     + `animation`: a simple animation display with settings for frame rate, looping, and color adjustments.
     + `template`: a display that takes a Jinja template and renders it with available system. can also specify text scrolling and paging options.
     + `rich_text_[scroll|page]`: similar to simple text scroll and page but also allows insertion of images and animations within the text.
     + `billboard`: a static rich text page. 
     + `clear`: blanks the display. This is generally issued by the router but a client can send it as well.
- The admin UI should allow the creation of a `carousel`. This is a looping sequence of `window`s of changing payloads displayed in a regular order and cadence. Each `window` is either a local or client generated payload. Options for each window should include a sort of `modulus` (only display every `n` cycles), an `any` payload rule for a given source, as well as specific rules. A preview of the carousel with the ability to advance windows and display on the admin sim display should be presented.
- The API should also support a `preview` endpoint that allows users to send payloads and see them rendered in the admin sim display without needing to create a template or command. This would be very useful for testing out payloads and templates before committing them to the system. This could also be demoed through the admin ui.
- The API should also support a `validate` endpoint that allows users to send payloads or templates and have them validated against the system's capabilities and return any errors or warnings. This would be very useful for ensuring that payloads and templates are correctly formatted and will work as expected before trying to use them in commands or displays. This could also be effected through the admin ui.



