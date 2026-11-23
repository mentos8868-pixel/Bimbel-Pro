import { Color3, Mesh, Quaternion, StandardMaterial, VertexData } from "@babylonjs/core";

let model;

// The bundled avatar uses a single GLB buffer, float vectors and uint16 indices.
async function loadModel() {
  const response = await fetch(import.meta.env.BASE_URL + "avatar-anak-bimbel-pro.glb");
  if (!response.ok) throw new Error("Model Piyama Dino tidak tersedia");
  const buffer = await response.arrayBuffer();
  const header = new DataView(buffer);
  if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2) {
    throw new Error("Format model Piyama Dino tidak valid");
  }
  const jsonLength = header.getUint32(12, true);
  const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)));
  const binary = 28 + jsonLength;
  const read = (id, ArrayType, width) => {
    const accessor = gltf.accessors[id];
    const view = gltf.bufferViews[accessor.bufferView];
    return new ArrayType(buffer, binary + (view.byteOffset || 0) + (accessor.byteOffset || 0), accessor.count * width);
  };
  return {
    colors: gltf.materials.map((m) => m.pbrMetallicRoughness.baseColorFactor),
    parts: gltf.nodes[0].children.map((id) => {
      const node = gltf.nodes[id];
      const part = gltf.meshes[node.mesh].primitives[0];
      return {
        node,
        material: part.material,
        positions: read(part.attributes.POSITION, Float32Array, 3),
        normals: read(part.attributes.NORMAL, Float32Array, 3),
        indices: read(part.indices, Uint16Array, 1),
      };
    }),
  };
}

export async function attachDinoModel(scene, parent, metadata) {
  model ??= loadModel().catch((error) => { model = undefined; throw error; });
  const { parts, colors } = await model;
  if (parent.isDisposed()) return false;

  // Merge pieces by color to keep the draw count low for multiplayer avatars.
  for (const [index, color] of colors.entries()) {
    const pieces = parts.filter((part) => part.material === index).map(({ node, positions, normals, indices }) => {
      const mesh = new Mesh(node.name, scene);
      const data = new VertexData();
      data.positions = positions;
      data.normals = normals;
      data.indices = Uint16Array.from(indices);
      for (let i = 0; i < data.indices.length; i += 3) {
        [data.indices[i + 1], data.indices[i + 2]] = [data.indices[i + 2], data.indices[i + 1]];
      }
      data.applyToMesh(mesh);
      mesh.position.set(...node.translation);
      mesh.scaling.set(...node.scale);
      mesh.rotationQuaternion = Quaternion.FromArray(node.rotation);
      mesh.computeWorldMatrix(true);
      return mesh;
    });
    if (!pieces.length) continue;
    const mesh = Mesh.MergeMeshes(pieces, true, true);
    const material = new StandardMaterial("Piyama Dino", scene);
    material.diffuseColor = new Color3(...color.slice(0, 3)).toGammaSpace();
    material.specularColor.set(.08, .08, .08);
    mesh.material = material;
    mesh.parent = parent;
    mesh.metadata = metadata;
  }
  return true;
}
