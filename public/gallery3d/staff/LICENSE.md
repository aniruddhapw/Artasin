# Gallery staff models

`desk.glb` (the custom-orders desk representative) and `helper.glb` (the
Artasin helper) are converted from the Microsoft Rocketbox Avatar Library,
<https://github.com/microsoft/Microsoft-Rocketbox>:

- `desk.glb`: `Assets/Avatars/Professions/Business_Female_01`, with the
  animations `f_idle_neutral_01` and `f_wave_01`.
- `helper.glb`: `Assets/Avatars/Professions/Business_Male_06`, with the
  animations `m_idle_neutral_01`, `m_wave_01` and `m_walk_neutral_01`.

They were converted from FBX to glTF with three.js (FBXLoader and
GLTFExporter), with textures reduced to 1024 px and re-encoded as WebP, and
geometry and animation compressed with glTF-Transform (meshopt). The root
motion was removed from the clips so the gallery moves the figures itself.

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
