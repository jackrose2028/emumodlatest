// Lesson cards for the Classroom page (use case 4). Each lesson fills a 45-minute class: a plan with timings,
// "Show me" steps that drive the live views, key facts, questions to discuss and a printable worksheet with an
// answer key. Facts are about the NES (Nintendo Entertainment System, 1983/1985), the system the live views
// read in most detail; the Sprite Lab and Palette Explorer programs in homebrew/ are made for these lessons.
//
// Plan step "show": { game: catalog id, view: tab id, overlay: "grid" | "sprites", pause: true, play: true,
//                    watch: [RAM addresses to watch in the Memory view] }
// Worksheet items: { q, lines } | { q, grid: 8 } | { q, table: { head: [...], rows: [[...]] } } with "answer".
// Exit ticket ("quiz"): [{ q, options: [four answers], answer: index of the right one, why }], shown on screen with
// instant answers and printed on the worksheet.

export const LESSONS = [
    {
        id: "palettes",
        title: "Palettes: why old games used so few colours",
        age: "Ages 10 and up",
        summary: "The NES could only show 25 colours at once, picked from 64. Students find colour codes, see a game's palette change live, and colour a tile like a 1985 artist.",
        game: "hb:palette-explorer",
        facts: [
            "A modern screen can show about 16.7 million colours; every pixel stores its own colour in 3 bytes.",
            "The NES has a fixed master list of 64 colour codes ($00 to $3F); about 54 of them are different colours (several are the same black).",
            "The console keeps the colours in use in 32 bytes of palette memory: 4 palettes for the background and 4 for sprites, 4 colours each.",
            "Colour 0 of every palette is the same shared backdrop colour, so the most colours on screen at once is 1 + 8 × 3 = 25.",
            "Each 16 × 16 pixel square of the background can use only one of the 4 background palettes. Artists planned their pictures around that grid.",
            "Pixels in the game's graphics do not store colours at all: they store a number from 0 to 3, which picks a colour from a palette. Change the palette and the same graphics change colour."
        ],
        plan: [
            { min: 5, title: "Hook", text: "Ask: how many colours can your phone show? (Millions.) Start Palette Explorer and press Right a few times: this is every colour the NES knew.", show: { game: "hb:palette-explorer", view: "palette", play: true } },
            { min: 10, title: "Explain", text: "Open the Palette view: 8 palettes of 4 colours, colour 0 shared. Count together: 1 + 8 × 3 = 25. Show the master palette grid and how the code ($21) is a row and a column.", show: { view: "palette" } },
            { min: 15, title: "Hands-on", text: "In pairs, use Palette Explorer (Left/Right one step, Up/Down a row) to find the codes for sky blue, grass green, a red, white and black. Write them on the worksheet. Use the Screen view and point at a pixel to check a code.", show: { view: "screen", overlay: "grid" } },
            { min: 10, title: "Worksheet", text: "Students colour the 8 × 8 tile using only 4 colours and answer the questions." },
            { min: 5, title: "Wrap-up", text: "Discuss: why do games for the same console look alike? What would an artist do to show a fifth colour in one 16 × 16 square? (Use a sprite on top.)" }
        ],
        questions: [
            "Why did the NES store colour numbers instead of real colours?",
            "What happens to a picture when you change one palette entry?",
            "Why might two characters in a game have the same shape but different colours?"
        ],
        worksheet: {
            intro: "Use the Palette Explorer program and the Palette view to answer.",
            items: [
                { q: "How many colour codes are in the NES master palette?", lines: 1, answer: "64 (about 54 different colours)" },
                { q: "How many palettes does the NES have for the background? For sprites?", lines: 1, answer: "4 and 4" },
                { q: "Each palette has 4 entries. Why can it only add 3 new colours?", lines: 2, answer: "Entry 0 is the shared backdrop colour, the same in every palette." },
                { q: "What is the most colours the NES can show on screen at once?", lines: 1, answer: "25 = 1 backdrop + 8 palettes × 3 colours" },
                { q: "Find the code for each colour with Palette Explorer.", table: { head: ["Colour", "Code ($..)"], rows: [["Sky blue", ""], ["Grass green", ""], ["Red", ""], ["White", ""], ["Black", ""]] }, answer: "For example: sky blue $21 or $22, green $1A or $2A, red $16, white $30, black $0F (other close codes are fine)" },
                { q: "Colour this 8 × 8 tile using only 4 colours. Write your 4 colour codes underneath.", grid: 8, answer: "Any picture with at most 4 colours." },
                { q: "A 16 × 16 square of background can use how many palettes?", lines: 1, answer: "1" },
                { q: "A modern colour takes 3 bytes. How many bytes would 25 modern colours take? How many bytes does the NES palette memory use?", lines: 2, answer: "75 bytes; the NES uses 32 bytes" }
            ]
        }
    },
    {
        id: "sprites",
        title: "Sprites: moving pictures and the 8-per-line limit",
        age: "Ages 10 and up",
        summary: "Characters are built from 8 × 8 sprites. Students watch the console's sprite list update live, discover that only 8 sprites fit on one line, and see how flicker hides the problem.",
        game: "hb:sprite-lab",
        facts: [
            "A sprite is a small picture (8 × 8 pixels, or 8 × 16) the console can draw anywhere on the screen, over the background.",
            "The NES keeps 64 sprites in 256 bytes of sprite memory (OAM): 4 bytes each, for Y position, tile number, attributes (palette and flip) and X position.",
            "Bigger characters are several sprites moved together: the Sprite Lab robot is 4 sprites (16 × 16 pixels).",
            "The NES can only draw 8 sprites on any one line of the screen. Sprites after the eighth on that line are simply not drawn.",
            "Games hid this by changing the order of the sprite list every frame, so a different sprite disappears each time. That is the flicker you see in many NES games.",
            "Sprites can be flipped left-right or up-down by one bit, so one drawing serves for walking both ways."
        ],
        plan: [
            { min: 5, title: "Hook", text: "Start Sprite Lab. Count the balls on the screen with the class (8). Then show the Sprites view: the console says there are 10.", show: { game: "hb:sprite-lab", view: "sprites", overlay: "sprites", play: true } },
            { min: 10, title: "Explain", text: "Walk through the sprite list: 4 bytes per sprite. Move the robot with the arrow keys and watch its X and Y change. Pause and step a frame at a time.", show: { view: "sprites", overlay: "sprites" } },
            { min: 15, title: "Hands-on", text: "Move the robot up to the line of balls: now even fewer balls show (the robot uses 2 of the 8 places on that line). Press A to turn on flicker and step frame by frame: which balls are drawn in each frame?", show: { view: "sprites", overlay: "sprites" } },
            { min: 10, title: "Worksheet", text: "Students decode the 4 bytes of a sprite and draw where it appears." },
            { min: 5, title: "Wrap-up", text: "Discuss: why do old games flicker when many enemies are on screen? Why do characters often stand in a row instead of a column?" }
        ],
        questions: [
            "Why is a 16 × 16 character 4 sprites and not 1?",
            "What would happen if a game put 12 enemies in one row?",
            "Which is better: sprites that vanish, or sprites that flicker? Why?"
        ],
        worksheet: {
            intro: "Use Sprite Lab and the Sprites view.",
            items: [
                { q: "How many sprites can the NES keep in its sprite memory?", lines: 1, answer: "64" },
                { q: "How many bytes does each sprite use, and what are they?", lines: 2, answer: "4: Y position, tile number, attributes (palette, flip, priority), X position" },
                { q: "How many sprites can be drawn on one line of the screen?", lines: 1, answer: "8" },
                { q: "Sprite Lab has 10 balls on one line. How many can you see? Why?", lines: 2, answer: "8, because only 8 sprites are drawn on a line" },
                { q: "Move the robot onto the line of balls. How many balls can you see now? Explain.", lines: 2, answer: "6: the robot's 2 sprites on that line use 2 of the 8 places" },
                { q: "Decode this sprite: Y = 100, tile = 2, attributes = 1, X = 40. Where is it, and which palette does it use?", lines: 2, answer: "Its top edge is on line 101 (the NES draws sprites one line below their Y), 40 pixels from the left, using sprite palette 1" },
                { q: "Draw a 16 × 16 character on the grid and mark the 4 sprites it is made of.", grid: 16, answer: "Any drawing split into four 8 × 8 squares." },
                { q: "Explain in your own words what flicker is and why games used it.", lines: 3, answer: "Changing the sprite order every frame so a different sprite is dropped each frame; every sprite is seen part of the time instead of some never." }
            ]
        }
    },
    {
        id: "tiles",
        title: "Tiles and scrolling: building worlds from 8 × 8 squares",
        age: "Ages 11 and up",
        summary: "Backgrounds are grids of reusable tiles. Students see the whole background map the console holds, watch the screen window scroll across it, and work out how much memory tiles save.",
        game: "hb:sprite-lab",
        facts: [
            "The NES background is a grid of 32 × 30 tiles, each 8 × 8 pixels: 256 × 240 pixels in all.",
            "The grid (a nametable) stores one byte per tile: which of 256 tile drawings goes there. 960 bytes describe the whole screen.",
            "The tile drawings themselves (pattern tables) are 16 bytes each: 2 bits per pixel, so 4 colours per tile.",
            "Reusing tiles saves a lot of memory: 960 bytes plus the drawings, instead of 61,440 pixels.",
            "The console's video memory holds 2 nametables, enough for two screens side by side (or one above the other).",
            "Scrolling moves a screen-sized window across the nametables, one pixel at a time, by writing an X and a Y to the scroll register. Games fill in new columns just off screen as they go."
        ],
        plan: [
            { min: 5, title: "Hook", text: "Start Sprite Lab and switch on the 8 × 8 grid in the Screen view: the world is squares. Ask: which squares are the same?", show: { game: "hb:sprite-lab", view: "screen", overlay: "grid", play: true } },
            { min: 10, title: "Explain", text: "Open the Tiles view: these are all the drawings in the cartridge. Then the Background view: the map is just tile numbers. Count how many different tiles the map uses.", show: { view: "tiles" } },
            { min: 15, title: "Hands-on", text: "Press B in Sprite Lab to scroll. Watch the white window move across the two screens in the Background view. Pause and step: how many pixels does it move per frame?", show: { view: "background" } },
            { min: 10, title: "Worksheet", text: "Students fill in a tile map and do the memory sums." },
            { min: 5, title: "Wrap-up", text: "Discuss: where else are tiles used today (maps, mosaics, Minecraft, text characters)?" }
        ],
        questions: [
            "Why is a brick wall cheap in memory and a photograph expensive?",
            "Why do old games often have repeating patterns?",
            "How does a game seem to have a level much longer than two screens?"
        ],
        worksheet: {
            intro: "Use Sprite Lab with the Screen, Tiles and Background views.",
            items: [
                { q: "How many tiles wide and tall is an NES screen?", lines: 1, answer: "32 wide, 30 tall" },
                { q: "How many tiles is that in all? How many bytes does the grid need, at one byte per tile?", lines: 1, answer: "960 tiles, 960 bytes" },
                { q: "The screen is 256 × 240 pixels. How many pixels is that?", lines: 1, answer: "61,440" },
                { q: "How many different tiles does Sprite Lab's background use? (Background view)", lines: 1, answer: "6: blank sky, brick, grass, two cloud halves and the block" },
                { q: "Design a level on the grid: write a letter for each tile (S = sky, B = brick, G = grass, C = cloud).", grid: 8, answer: "Any map using the tile letters." },
                { q: "When Sprite Lab scrolls, how many pixels does the window move each frame? How many frames to move one whole screen?", lines: 2, answer: "1 pixel; 256 frames (about 4 seconds)" },
                { q: "Why do games draw new columns of tiles just outside the screen?", lines: 2, answer: "So the new part of the level is ready before it scrolls into view." }
            ]
        }
    },
    {
        id: "sound",
        title: "Sound channels: music from five simple voices",
        age: "Ages 10 and up",
        summary: "NES music is made by five channels with fixed jobs. Students hear each channel on its own, watch the channels switch on in a game, and connect pitch to numbers.",
        game: "hb:sprite-lab",
        facts: [
            "The NES sound chip has 5 channels: 2 pulse (square) waves, 1 triangle wave, 1 noise channel and 1 sample channel (DMC).",
            "Pulse channels play melodies. Their 'duty' sets how much of each wave is high: 12.5 %, 25 %, 50 % or 75 %. Thinner pulses sound brighter and buzzier.",
            "The triangle channel is soft and round, usually the bass line. It has no volume control: it is either on or off.",
            "The noise channel makes hiss and crashes for drums, explosions and wind.",
            "Pitch is a number: the channel counts down from a value (the period) and flips its output each time; a smaller number means a higher note. Pulse frequency = 1,789,773 ÷ (16 × (period + 1)).",
            "Only one note per channel at a time, so composers wrote clever arrangements: fast arpeggios to fake chords, and drums borrowed from the noise channel."
        ],
        plan: [
            { min: 5, title: "Hook", text: "Play the four 'Hear each channel' buttons in the Sound view. Ask students to describe each sound in one word.", show: { view: "sound" } },
            { min: 10, title: "Explain", text: "Show the channel list while pressing A, B and Select in Sprite Lab: each button switches on one channel. Point at duty, volume and frequency.", show: { game: "hb:sprite-lab", view: "sound", play: true } },
            { min: 15, title: "Hands-on", text: "Load a game with music (from the game library or My Collection). In groups, listen and fill in which channel plays the melody, the bass and the drums. Watch the waveform.", show: { view: "sound" } },
            { min: 10, title: "Worksheet", text: "Students match sounds to channels and work out a frequency." },
            { min: 5, title: "Wrap-up", text: "Discuss: how did composers make music sound full with so few voices?" }
        ],
        questions: [
            "Why is the triangle channel often used for bass?",
            "How could you play a chord with only one note per channel?",
            "Which channel would you use for a door slamming? A bird? Rain?"
        ],
        worksheet: {
            intro: "Use the Sound view and Sprite Lab.",
            items: [
                { q: "Name the 5 NES sound channels.", lines: 2, answer: "Pulse 1, pulse 2, triangle, noise, DMC (samples)" },
                { q: "Which button in Sprite Lab plays which channel?", table: { head: ["Button", "Channel"], rows: [["A", ""], ["B", ""], ["Select", ""]] }, answer: "A: pulse 1, B: triangle, Select: noise" },
                { q: "Which pulse duty sounds the thinnest? Which sounds the fullest?", lines: 1, answer: "12.5 % thinnest; 50 % fullest" },
                { q: "Match the sound to the channel: drum, bass line, melody, explosion.", lines: 2, answer: "Drum: noise; bass: triangle; melody: pulse; explosion: noise" },
                { q: "Sprite Lab's beep uses period 253. Work out the frequency: 1,789,773 ÷ (16 × 254). Which note is it close to?", lines: 2, answer: "About 440 Hz, the note A" },
                { q: "In the game you listened to, which channel played the melody, the bass and the drums?", table: { head: ["Part", "Channel"], rows: [["Melody", ""], ["Bass", ""], ["Drums", ""]] }, answer: "Usually pulse, triangle and noise" }
            ]
        }
    },
    {
        id: "memory",
        title: "Memory limits: a whole game in less than a photo",
        age: "Ages 11 and up",
        summary: "An NES has 2 KB of working memory. Students watch that memory change live as a game runs, compare game sizes to everyday files, and see how programmers made every byte count.",
        game: "hb:sprite-lab",
        facts: [
            "The NES has 2 KB (2,048 bytes) of working memory (RAM) for everything the game must remember: positions, score, lives, timers.",
            "Video memory is another 2 KB (the two background maps), plus 256 bytes of sprite memory and 32 bytes of palette memory.",
            "The game itself lives on the cartridge (read-only memory). Early games were 24 to 40 KB; later ones used extra chips (mappers) to switch in more, up to about 1 MB.",
            "A single phone photo is about 3 MB: more than a hundred early NES games.",
            "One byte holds a number from 0 to 255. Programmers packed several on/off flags into one byte to save space.",
            "Sprite Lab keeps its sprite list at $0200 to $02FF in RAM and copies it to the video chip 60 times a second."
        ],
        plan: [
            { min: 5, title: "Hook", text: "Ask: how big is a photo on your phone? (About 3 MB.) Show this game's cartridge size in the Memory view.", show: { game: "hb:sprite-lab", view: "memory", play: true } },
            { min: 10, title: "Explain", text: "The heat map is all 2,048 bytes of RAM; bright squares just changed. Move the robot: which bytes light up? Press B: a new byte starts changing (the scroll position).", show: { view: "memory" } },
            { min: 15, title: "Hands-on", text: "Detectives: find the byte for the robot's X with Find a byte. Press Start a search, hold Right for a moment, press Went up; wait, press Didn't change; repeat until a few bytes are left, then click one to watch it. Do the same for Y (hold Down). Type a new value with Set and watch the robot jump.", show: { view: "memory" } },
            { min: 10, title: "Worksheet", text: "Students do the size comparisons and record the addresses they found." },
            { min: 5, title: "Wrap-up", text: "Discuss: what would you leave out of a game if you only had 2 KB? Why are modern games so much bigger?" }
        ],
        questions: [
            "What does a game need to remember while it runs?",
            "Why could a game not keep a picture of the whole screen in RAM?",
            "What makes modern games so large?"
        ],
        worksheet: {
            intro: "Use the Memory view with Sprite Lab.",
            items: [
                { q: "How many bytes of working memory (RAM) does the NES have?", lines: 1, answer: "2,048 bytes (2 KB)" },
                { q: "How big is the Sprite Lab cartridge? (Memory view)", lines: 1, answer: "24 KB: 16 KB of program and 8 KB of graphics" },
                { q: "A phone photo is about 3 MB (3,000 KB). How many Sprite Labs fit in one photo?", lines: 1, answer: "About 125" },
                { q: "Find the bytes that hold the robot's position. Write their addresses.", table: { head: ["What", "Address"], rows: [["Robot X", ""], ["Robot Y", ""], ["Scroll position", ""]] }, answer: "X: $0013, Y: $0014, scroll: $0017 (sprite copies at $0200 to $020F change too)" },
                { q: "One byte holds 0 to 255. The robot's X position is one byte. What happens when it goes past 255?", lines: 2, answer: "It wraps around to 0: the robot appears on the left side." },
                { q: "The whole screen is 61,440 pixels. Why can't the NES store a picture of the screen in its 2 KB of RAM?", lines: 2, answer: "61,440 pixels need far more than 2,048 bytes; the console stores tile numbers instead." }
            ]
        }
    },
    {
        id: "frames",
        title: "Frames and input: 60 pictures a second",
        age: "Ages 10 and up",
        summary: "Games are flip books. Students pause a game, step one frame at a time, watch the frame counter and their own button presses, and learn why every frame has a time budget.",
        game: "hb:sprite-lab",
        facts: [
            "An NES draws a new picture (a frame) about 60 times a second (60.1 on American and Japanese consoles, 50 in Europe).",
            "That gives the game about 16.7 milliseconds per frame to read the controller, move everything and prepare the next picture.",
            "If the work takes longer, the game slows down: the famous slowdown when too many enemies are on screen.",
            "The controller is read once per frame: a button pressed and released between two reads can be missed.",
            "Moving a character 1 pixel per frame means 60 pixels a second; 2 pixels per frame is twice as fast.",
            "Pausing and stepping one frame at a time is how speedrunners and testers study exactly what a game does."
        ],
        plan: [
            { min: 5, title: "Hook", text: "Show a flip book (or draw one). Then pause Sprite Lab and step one frame at a time: the robot moves 1 pixel per step while you hold an arrow.", show: { game: "hb:sprite-lab", view: "timing", pause: true } },
            { min: 10, title: "Explain", text: "Timing view: frames per second and the 16.7 ms budget. Input view: watch each button light up and the frame it was pressed in.", show: { view: "input", play: true } },
            { min: 15, title: "Hands-on", text: "Challenge: press and release A as fast as you can. Did the game always notice? Step through frames to measure how many frames the robot needs to cross the screen.", show: { view: "input" } },
            { min: 10, title: "Worksheet", text: "Students do the frame sums." },
            { min: 5, title: "Wrap-up", text: "Discuss: why do games feel 'laggy'? What is a frame rate in modern games?" }
        ],
        questions: [
            "What is a frame?",
            "Why does a game slow down when too much happens at once?",
            "How could a very quick button press be missed?"
        ],
        worksheet: {
            intro: "Use the Timing and Input views and the Step button.",
            items: [
                { q: "How many frames does the NES draw per second?", lines: 1, answer: "About 60 (50 in Europe)" },
                { q: "How many milliseconds is one frame? (1,000 ÷ 60)", lines: 1, answer: "About 16.7 ms" },
                { q: "The robot moves 1 pixel per frame. How many pixels does it move in one second?", lines: 1, answer: "60" },
                { q: "The screen is 256 pixels wide. How many frames and seconds does the robot need to cross it?", lines: 2, answer: "256 frames, about 4.3 seconds" },
                { q: "Step 10 frames while holding Right. How far did the robot move?", lines: 1, answer: "10 pixels" },
                { q: "Why might a game miss a very quick button press?", lines: 2, answer: "The controller is only read once per frame; a press shorter than a frame can fall between two reads." }
            ]
        }
    },
    {
        id: "numbers",
        title: "Binary and hex: how the console counts",
        age: "Ages 11 and up",
        summary: "Every number inside the console is made of bits. Students watch the robot's position as decimal, hexadecimal and binary, change it by typing a new value, and see why a byte stops at 255.",
        game: "hb:sprite-lab",
        facts: [
            "A bit is 0 or 1. Eight bits make a byte, which holds 256 different values: 0 to 255.",
            "Binary counts in twos: each place is worth double the one to its right (128, 64, 32, 16, 8, 4, 2, 1).",
            "Hexadecimal counts in sixteens with the digits 0 to 9 and A to F. One hex digit is exactly 4 bits, so a byte is always two hex digits, $00 to $FF.",
            "Programmers write hex with a $ in front (or 0x): $13 is 19, $FF is 255.",
            "When a byte at 255 goes up by one it wraps around to 0, like a car's odometer rolling over.",
            "The NES controller's 8 buttons fit in one byte, one bit per button."
        ],
        plan: [
            { min: 5, title: "Hook", text: "Show Palette Explorer's colour codes ($00 to $3F) in the Palette view. Ask: what kind of numbers have letters in them?", show: { game: "hb:palette-explorer", view: "palette", play: true } },
            { min: 10, title: "Explain", text: "Open Sprite Lab's Memory view. The watched byte $0013 is the robot's X position, shown as a decimal number, in hex and in binary. Hold Right and watch all three count. Count the binary places together: 128, 64, 32, 16, 8, 4, 2, 1.", show: { game: "hb:sprite-lab", view: "memory", watch: [0x13, 0x14], play: true } },
            { min: 15, title: "Hands-on", text: "In pairs: type new values for $0013 and press Set (0, 16, 128, 255) and watch the robot jump. Hold Right when it is at 255: what happens? Then use Find a byte to track down another number on your own. Finally open the Tiles view and click a tile: its pixels are bits too.", show: { view: "memory" } },
            { min: 10, title: "Worksheet", text: "Students convert between decimal, binary and hex." },
            { min: 5, title: "Wrap-up", text: "Discuss: where do you still see hex today? (Web colours like #FF0000, error codes, network addresses.)" }
        ],
        questions: [
            "Why do programmers like hexadecimal better than decimal for bytes?",
            "Why does a byte stop at 255?",
            "What else in daily life wraps around to zero?"
        ],
        worksheet: {
            intro: "Use the Memory view with Sprite Lab, and the binary place values 128 64 32 16 8 4 2 1.",
            items: [
                { q: "Fill in the missing columns.", table: { head: ["Decimal", "Binary", "Hex"], rows: [["5", "", ""], ["16", "", ""], ["", "1111 1111", ""], ["", "", "$13"], ["", "", "$80"]] }, answer: "5 = 0000 0101 = $05; 16 = 0001 0000 = $10; 1111 1111 = 255 = $FF; $13 = 19 = 0001 0011; $80 = 128 = 1000 0000" },
                { q: "How many different values can one byte hold? What is the biggest?", lines: 1, answer: "256 values; the biggest is 255 ($FF)" },
                { q: "Set the robot's X ($0013) to 128. Where is the robot? Why there?", lines: 2, answer: "About halfway across: 128 is half of 256, the width of the screen" },
                { q: "Hold Right when X is 255. What happens, and why?", lines: 2, answer: "It wraps around to 0 and the robot appears at the left: a byte can't hold 256." },
                { q: "Why is one hex digit exactly 4 bits?", lines: 2, answer: "4 bits have 16 combinations, and hex has 16 digits (0 to F)." },
                { q: "Write a colour as a web colour (#RRGGBB). How many bytes is it?", lines: 2, answer: "Any #RRGGBB colour; 3 bytes, one each for red, green and blue." }
            ]
        }
    }
];

// Exit tickets
const QUIZZES = {
    palettes: [
        { q: "At most, how many colours can the NES show on screen at once?", options: ["16.7 million", "64", "25", "4"], answer: 2, why: "1 shared backdrop + 8 palettes × 3 colours." },
        { q: "What does a pixel in an NES tile store?", options: ["Its own red, green and blue", "A number from 0 to 3 that picks a palette colour", "A letter", "Nothing: it is always black"], answer: 1, why: "The palette turns the number into a colour." },
        { q: "Colour 0 of every palette is…", options: ["Always white", "The shared backdrop colour", "Different in each palette", "Unused"], answer: 1, why: "It is shared, so each palette only adds 3 colours." },
        { q: "How big an area of background must share one palette?", options: ["One pixel", "8 × 8 pixels", "16 × 16 pixels", "The whole screen"], answer: 2, why: "Artists planned their pictures around that 16 × 16 grid." }
    ],
    sprites: [
        { q: "How many sprites can the NES keep in its sprite list?", options: ["8", "16", "64", "256"], answer: 2, why: "64 sprites × 4 bytes = 256 bytes of sprite memory." },
        { q: "How many sprites can be drawn on one line of the screen?", options: ["4", "8", "16", "64"], answer: 1, why: "Sprites after the eighth on a line are not drawn." },
        { q: "Why do some NES games flicker?", options: ["The television is broken", "The game changes the sprite order each frame, so a different sprite is dropped", "The cartridge is dirty", "Sprites are made of light"], answer: 1, why: "Every sprite is then seen part of the time." },
        { q: "A 16 × 16 character made of 8 × 8 sprites uses how many sprites?", options: ["1", "2", "4", "16"], answer: 2, why: "Two across and two down." }
    ],
    tiles: [
        { q: "How many tiles make one NES screen?", options: ["32 × 30 = 960", "256 × 240 = 61,440", "8 × 8 = 64", "100"], answer: 0, why: "Each tile is 8 × 8 pixels." },
        { q: "What does the background map store for each square?", options: ["A tile number", "A photo", "The colour of every pixel", "The score"], answer: 0, why: "One byte per square says which drawing goes there." },
        { q: "How does scrolling work?", options: ["The game redraws every pixel", "A screen-sized window moves across the background maps", "The television moves", "The cartridge spins"], answer: 1, why: "The scroll register sets where the window starts." },
        { q: "Why do tiles save memory?", options: ["Each drawing is stored once and used many times", "Tiles are tiny photos", "They are invisible", "They need no memory at all"], answer: 0, why: "A brick wall is one drawing repeated." }
    ],
    sound: [
        { q: "How many sound channels does the NES have?", options: ["1", "3", "5", "64"], answer: 2, why: "2 pulse, triangle, noise and DMC." },
        { q: "Which channel usually plays the bass line?", options: ["Pulse 1", "Triangle", "Noise", "DMC"], answer: 1, why: "Its soft, round sound suits bass." },
        { q: "Which channel makes drums and explosions?", options: ["Triangle", "Pulse 2", "Noise", "None of them"], answer: 2, why: "Noise is hiss and crashes." },
        { q: "A smaller period number means…", options: ["A higher note", "A lower note", "A louder note", "Silence"], answer: 0, why: "The channel flips its output more often." }
    ],
    memory: [
        { q: "How much working memory (RAM) does the NES have?", options: ["2 KB", "2 MB", "2 GB", "64 KB"], answer: 0, why: "2,048 bytes for everything the game remembers." },
        { q: "What range of numbers fits in one byte?", options: ["0 to 9", "0 to 100", "0 to 255", "0 to 1,000,000"], answer: 2, why: "8 bits give 256 values." },
        { q: "A byte holds 255 and the game adds 1. What does it hold now?", options: ["256", "0", "255", "It breaks the console"], answer: 1, why: "It wraps around, like an odometer." },
        { q: "Where is the game's program kept?", options: ["In RAM", "On the cartridge (ROM)", "On the internet", "In the controller"], answer: 1, why: "RAM only holds what changes while playing." }
    ],
    frames: [
        { q: "About how many frames does an NES draw each second?", options: ["1", "24", "60", "1,000"], answer: 2, why: "50 on European consoles." },
        { q: "About how long is one frame?", options: ["1 second", "16.7 milliseconds", "1 minute", "1 millisecond"], answer: 1, why: "1,000 ms ÷ 60." },
        { q: "How often does a game read the controller?", options: ["Once per frame", "Once per second", "Only when paused", "Never"], answer: 0, why: "So a very short press can be missed." },
        { q: "Moving 2 pixels per frame, how far does something go in one second?", options: ["2 pixels", "60 pixels", "120 pixels", "256 pixels"], answer: 2, why: "2 × 60 frames." }
    ],
    numbers: [
        { q: "What is $FF in decimal?", options: ["15", "99", "255", "256"], answer: 2, why: "F is 15: 15 × 16 + 15 = 255." },
        { q: "How many bits are in a byte?", options: ["2", "4", "8", "16"], answer: 2, why: "Two hex digits of 4 bits each." },
        { q: "What is binary 0000 0101 in decimal?", options: ["5", "101", "10", "3"], answer: 0, why: "4 + 1." },
        { q: "A byte holds 255 and goes up by one. What does it hold now?", options: ["256", "0", "255", "−1"], answer: 1, why: "It wraps around to 0." }
    ]
};
for (const l of LESSONS) l.quiz = QUIZZES[l.id] || [];
