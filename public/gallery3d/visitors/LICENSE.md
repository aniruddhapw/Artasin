# Gallery visitor models

The four visitors and their two shared animation files are converted from the
Microsoft Rocketbox Avatar Library, <https://github.com/microsoft/Microsoft-Rocketbox>:

- `f03.glb`: `Assets/Avatars/Adults/Female_Adult_03`
- `f09.glb`: `Assets/Avatars/Adults/Female_Adult_09`
- `m03.glb`: `Assets/Avatars/Adults/Male_Adult_03`
- `m17.glb`: `Assets/Avatars/Adults/Male_Adult_17`
- `anims-f.glb`: `f_idle_neutral_02` (as "idle") and `f_walk_stroll_01` (as "walk")
- `anims-m.glb`: `m_idle_neutral_02` (as "idle") and `m_walk_stroll_01` (as "walk")

They were converted from FBX to glTF with three.js (FBXLoader and
GLTFExporter). Each avatar's material groups were merged, its colour textures
reduced to 512 px (256 px for the hair and eyelash cut-outs) and re-encoded as
WebP, and its mesh simplified to about half the triangles with glTF-Transform
(weld, simplify, meshopt). Normal maps were left out.

The body texture's alpha holds a mask for dyeing a visitor's top
(components/gallery3d/crowd.ts): 255 on the top garment, 204 on other
clothes, 153 on skin. Skin was found with a standard skin-tone test on the
colours; the top garment is every texture patch (UV island) that is mostly
not moved by the leg bones.

The animation files hold only a skeleton and the clips: body bones only (no
face or helper bones), rotations plus the root and pelvis positions, with the
walk's forward travel removed so the gallery moves the figures itself. The
idle keeps every third keyframe. Any avatar of the same sex plays them, as the
clips find their bones by name.

Gonzalez-Franco et al., "The Rocketbox library and the utility of freely
available rigged avatars", Frontiers in Virtual Reality (2020),
doi:10.3389/frvir.2020.561558.

---

MIT License

Copyright (c) 2020 Microsoft

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
