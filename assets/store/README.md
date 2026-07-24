# Store artwork package

This directory contains original Bank Manager key art, deterministic derivatives, and genuine in-game captures. Run `npm run assets:store` after changing the master art and `npm run capture:store` after changing store-worthy gameplay presentation.

## Deliverables

| Asset | Dimensions | Content rule |
| --- | ---: | --- |
| Store header | 920x430 | Artwork and game title only |
| Small capsule | 462x174 | Artwork and game title only |
| Main capsule | 1232x706 | Artwork and game title only |
| Vertical capsule | 748x896 | Artwork and game title only |
| Library capsule | 600x900 | Artwork and game title only |
| Library header | 920x430 | Artwork and game title only |
| Library hero | 3840x1240 | Artwork only; no text |
| Library logo | up to 1280x720 | Transparent title treatment only |
| Page background | 1438x810 | Artwork only |
| Shortcut icon | 256x256 | Square icon |
| Client icon | 184x184 | JPG icon |
| Screenshots | 1920x1080 | Actual gameplay only |

Dimensions and content constraints follow the [Steamworks graphical asset overview](https://partner.steamgames.com/doc/store/assets?language=english), [standard asset guide](https://partner.steamgames.com/doc/store/assets/standard?language=english), and [graphical asset rules](https://partner.steamgames.com/doc/store/assets/rules).

`store-assets.json` records the exact dimensions and SHA-256 digest of every generated graphical deliverable. The nine numbered files under `screenshots/` are produced by the hidden Electron capture harness from deterministic game states; they are not concept art or retouched mockups.

## Master-art provenance

The text-free `key-art-master.png` was generated for this project with OpenAI image generation. Final generation prompt:

> Use case: stylized-concept. Asset type: master key art for a management-strategy game's Steam store and library capsules. Primary request: original key art for a game about growing a small 1850s frontier bank into a respected regional banking network. Scene/backdrop: warm Wild West bank interior opening onto a sunlit frontier main street, with subtle distant branch buildings suggesting expansion. Subject: a capable frontier banker standing at a brass teller counter, a small varied customer queue, an iron vault, ledger books, coins, loan papers, and telegraph equipment; the bank and management work are the clear focus. Style/medium: polished hand-painted game key art with the same warm brown, brass, cream, muted green, and dusty blue character of an accessible strategy-management game; stylized proportions, not photorealistic and not grim. Composition/framing: versatile near-square master composition designed to crop cleanly into wide 2:1 banners and vertical 2:3 capsules; keep the banker and teller counter centered, important faces and props within the central 55 percent, quieter darker edges, and generous uncluttered upper-middle space for a separately applied title. Lighting/mood: welcoming golden morning light, industrious, optimistic, strategic, trustworthy. Materials/textures: worn wood, aged brass, paper ledgers, leather, iron safe, dusty sunlight. Constraints: historically plausible 1850s frontier setting; accurately communicate banking management gameplay; PG-13; no text, no letters, no numbers, no signage, no logos, no UI, no watermark, no modern objects, no guns, no violence. Avoid: photorealism, cinematic action scene, generic saloon imagery, excessive cowboy clichés, tiny unreadable details, important content at extreme edges.

The first draft contained a telephone-like object. It was edited with this prompt:

> Remove only the black telephone-like communications device and its cords from the lower-right foreground; replace that footprint with a simple period-appropriate 1850s brass inkwell, quill holder, and neatly stacked loan papers. Preserve the banker, all customers, faces, poses, teller counter, vault, ledgers, coins, lighting, palette, camera angle, framing, architecture, and every other object unchanged; retain the clear upper-middle title space; no text, letters, numbers, signage, logos, watermark, or modern objects.

The title treatment is generated locally by `tools/store-assets.mjs`; it is not baked into the source art.
