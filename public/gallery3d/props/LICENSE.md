# Gallery props

`plant.glb` is "Potted Plant 02" by Rico Cilliers from Poly Haven,
<https://polyhaven.com/a/potted_plant_02>, released under CC0 (public domain;
no attribution required, credited here anyway).

It was taken from the 1k glTF download with only its colour textures (normal
and roughness maps dropped), made opaque (its leaves are modelled, not cut
out of a texture), simplified with glTF-Transform from about 70k to 5.5k
triangles (`simplify --ratio 0.08 --error 0.02`), its textures reduced to
512 px WebP, and compressed with meshopt.

The benches are built in code (components/gallery3d/props.ts).
