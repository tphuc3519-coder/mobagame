# modelgen — sinh model 3D tướng bằng code

Sinh `assets/heroes/<id>/<id>.glb` + `hero.art.json` cho 16 tướng: một SkinnedMesh (1 draw call), màu tô theo đỉnh,
vật liệu thân + vật liệu phát sáng, bộ xương người chung (`Bone_*`), 11 clip đúng tên chuẩn 02 §13.5.

```
cd tools/modelgen && npm install        # cần three@0.186.0 (chỉ để chạy script, game không cần build)
node build.mjs                          # build tất cả (hoặc: node build.mjs long_dang hoa_ren)
npm i --no-save gltf-validator && node validate.mjs   # kiểm tra định dạng Khronos
# xem: python3 -m http.server 8080 ở gốc repo → http://localhost:8080/tools/model-check.html?src=../assets/heroes/long_dang/long_dang.glb
# bảng nhiều tướng: tools/model-sheet.html?ids=long_dang,hoa_ren   (chụp ảnh: NODE_PATH=$(npm root -g) node sheet.cjs out.png ids)
```

- `kit.mjs` khối nguyên thuỷ, loft, trọng số xương · `humanoid.mjs` xương + thân chung · `anim.mjs` thư viện đòn/clip
- `parts.mjs` phụ kiện dùng chung · `heroes/<id>.mjs` thiết kế từng tướng (theo 09 §4)
- Muốn thay bằng model hoạ sĩ: đè `assets/heroes/<id>/<id>.glb` (giữ tên clip/xương theo 02 §13.5, 09 §3.4).
